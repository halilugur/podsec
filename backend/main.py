from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import timedelta
import subprocess
import json
import logging
import os
import httpx
import base64
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import init_db, get_db, User
from auth import (
    authenticate_user, create_access_token, get_current_user,
    get_password_hash, verify_password,
    Token, UserLogin, UserResponse, PasswordChange,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Podman configuration
PODMAN_HOST = os.getenv("PODMAN_HOST", "")  # e.g., unix:///run/podman/podman.sock or tcp://localhost:8080
PODMAN_CONNECTION = os.getenv("PODMAN_CONNECTION", "my-tcp")  # Named connection from podman system connection list

# Determine if we're using HTTP API (for remote TCP connections)
USE_HTTP_API = PODMAN_HOST and PODMAN_HOST.startswith("tcp://")
if USE_HTTP_API:
    PODMAN_API_URL = PODMAN_HOST.replace("tcp://", "http://")
    logger.info(f"Using HTTP API mode - URL: {PODMAN_API_URL}")
else:
    PODMAN_API_URL = None
    logger.info(f"Using CLI mode - Host: {PODMAN_HOST or 'default'}, Connection: {PODMAN_CONNECTION or 'default'}")

app = FastAPI(title="PodSec - Podman Secrets Manager", version="1.0.0")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecretCreate(BaseModel):
    name: str
    data: str
    driver: Optional[str] = "file"


class BulkSecretCreate(BaseModel):
    secrets: List[SecretCreate]


class SecretResponse(BaseModel):
    ID: str
    Name: str
    Driver: str
    CreatedAt: str
    UpdatedAt: str


class SecretDetail(BaseModel):
    ID: str
    Name: str
    Driver: str
    CreatedAt: str
    UpdatedAt: str
    Spec: dict


async def http_api_request(method: str, endpoint: str, **kwargs) -> dict:
    """Make HTTP request to Podman API."""
    url = f"{PODMAN_API_URL}/v4.0.0/libpod{endpoint}"
    logger.info(f"HTTP API: {method} {url}")
    if 'json' in kwargs:
        try:
            import json as json_module
            logger.info(f"Request payload: {json_module.dumps(kwargs['json'], indent=2)}")
        except Exception as e:
            logger.info(f"Request payload: {kwargs['json']}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            
            if response.content:
                return response.json()
            return {}
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP API error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Podman API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"HTTP API request failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to connect to Podman API: {str(e)}"
            )


def run_podman_command(args: List[str]) -> dict:
    """Execute podman command and return parsed JSON output."""
    try:
        cmd = ["podman"]
        
        # Add host/connection configuration if set
        if PODMAN_HOST:
            cmd.extend(["--host", PODMAN_HOST])
        elif PODMAN_CONNECTION:
            cmd.extend(["--connection", PODMAN_CONNECTION])
        
        cmd.extend(args)
        logger.info(f"Executing: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        if result.stdout.strip():
            return json.loads(result.stdout)
        return {}
    except subprocess.CalledProcessError as e:
        logger.error(f"Podman command failed: {e.stderr}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Podman error: {e.stderr}"
        )
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse Podman output"
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Podman is not installed or not in PATH"
        )


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "service": "PodSec API"}


# ============= Authentication Endpoints =============

@app.post("/api/auth/login", response_model=Token)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, user_login.username, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return UserResponse(username=current_user.username, created_at=current_user.created_at)


@app.post("/api/auth/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password."""
    # Verify current password
    if not verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}


# ============= Secrets Endpoints (Protected) =============

@app.get("/api/secrets", response_model=List[SecretResponse])
async def list_secrets(current_user: User = Depends(get_current_user)):
    """List all Podman secrets."""
    try:
        if USE_HTTP_API:
            secrets = await http_api_request("GET", "/secrets/json")
            if not secrets:
                return []
            # Transform API response to match our model
            transformed = []
            for secret in secrets:
                transformed.append({
                    "ID": secret.get("ID", ""),
                    "Name": secret.get("Spec", {}).get("Name", ""),
                    "Driver": secret.get("Spec", {}).get("Driver", {}).get("Name", "file"),
                    "CreatedAt": secret.get("CreatedAt", ""),
                    "UpdatedAt": secret.get("UpdatedAt", "")
                })
            return transformed
        else:
            secrets = run_podman_command(["secret", "ls", "--format", "json"])
            if not secrets:
                return []
            return secrets
    except Exception as e:
        logger.error(f"Error listing secrets: {e}")
        raise


@app.post("/api/secrets", status_code=status.HTTP_201_CREATED)
async def create_secret(secret: SecretCreate, current_user: User = Depends(get_current_user)):
    """Create a new Podman secret."""
    # Log received data for debugging
    logger.info(f"Received secret creation request - name: '{secret.name}', data length: {len(secret.data)}, driver: {secret.driver}")
    
    # Validate secret name according to Podman requirements
    secret_name = secret.name.strip() if secret.name else ""
    if not secret_name or len(secret_name) < 1 or len(secret_name) > 253:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Secret name must be between 1 and 253 characters"
        )
    
    if any(char in secret_name for char in ['=', '/', ',', '\0']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Secret name cannot contain '=', '/', ',' or NULL characters"
        )
    
    try:
        if USE_HTTP_API:
            # Use HTTP API for remote connections
            # Podman API expects the name as a query parameter and base64 encoded data in body
            params = {"name": secret_name}
            
            # Base64 encode the secret data
            encoded_data = base64.b64encode(secret.data.encode('utf-8')).decode('utf-8')
            
            # Create the request body
            body = {
                "data": encoded_data,
                "driver": {
                    "name": secret.driver
                }
            }
            
            logger.info(f"Sending to Podman API - Name: '{secret_name}', Data length: {len(secret.data)} bytes, Driver: {secret.driver}")
            result = await http_api_request("POST", "/secrets/create", params=params, json=body)
            secret_id = result.get("ID", "")
            logger.info(f"Created secret: {secret_name} (ID: {secret_id})")
            return {"id": secret_id, "name": secret_name, "message": "Secret created successfully"}
        else:
            # Use CLI for local connections
            cmd = ["podman"]
            
            # Add host/connection configuration if set
            if PODMAN_HOST:
                cmd.extend(["--host", PODMAN_HOST])
            elif PODMAN_CONNECTION:
                cmd.extend(["--connection", PODMAN_CONNECTION])
            
            cmd.extend(["secret", "create", secret_name, "-"])
            
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate(input=secret.data)
            
            if process.returncode != 0:
                logger.error(f"Failed to create secret: {stderr}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to create secret: {stderr}"
                )
            
            secret_id = stdout.strip()
            logger.info(f"Created secret: {secret_name} (ID: {secret_id})")
            return {"id": secret_id, "name": secret_name, "message": "Secret created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating secret: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/secrets/bulk", status_code=status.HTTP_201_CREATED)
async def create_bulk_secrets(bulk: BulkSecretCreate, current_user: User = Depends(get_current_user)):
    """Create multiple Podman secrets at once."""
    results = {"success": [], "failed": []}
    
    for secret in bulk.secrets:
        try:
            # Validate secret name
            secret_name = secret.name.strip() if secret.name else ""
            if not secret_name or len(secret_name) < 1 or len(secret_name) > 253:
                results["failed"].append({"name": secret.name, "error": "Name must be 1-253 characters"})
                continue
            
            if any(char in secret_name for char in ['=', '/', ',', '\0']):
                results["failed"].append({"name": secret.name, "error": "Invalid characters in name"})
                continue
            
            if USE_HTTP_API:
                params = {"name": secret_name}
                encoded_data = base64.b64encode(secret.data.encode('utf-8')).decode('utf-8')
                body = {"data": encoded_data, "driver": {"name": secret.driver}}
                
                result = await http_api_request("POST", "/secrets/create", params=params, json=body)
                secret_id = result.get("ID", "")
                results["success"].append({"id": secret_id, "name": secret_name})
            else:
                cmd = ["podman"]
                if PODMAN_HOST:
                    cmd.extend(["--host", PODMAN_HOST])
                elif PODMAN_CONNECTION:
                    cmd.extend(["--connection", PODMAN_CONNECTION])
                
                cmd.extend(["secret", "create", secret_name, "-"])
                process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                stdout, stderr = process.communicate(input=secret.data)
                
                if process.returncode != 0:
                    results["failed"].append({"name": secret_name, "error": stderr})
                else:
                    secret_id = stdout.strip()
                    results["success"].append({"id": secret_id, "name": secret_name})
        
        except Exception as e:
            results["failed"].append({"name": secret.name, "error": str(e)})
    
    logger.info(f"Bulk create: {len(results['success'])} succeeded, {len(results['failed'])} failed")
    return results


@app.get("/api/secrets/{secret_id}", response_model=SecretDetail)
async def inspect_secret(secret_id: str, current_user: User = Depends(get_current_user)):
    """Inspect a specific Podman secret."""
    try:
        if USE_HTTP_API:
            result = await http_api_request("GET", f"/secrets/{secret_id}/json")
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Secret '{secret_id}' not found"
                )
            # Transform API response to match our model
            return {
                "ID": result.get("ID", ""),
                "Name": result.get("Spec", {}).get("Name", ""),
                "Driver": result.get("Spec", {}).get("Driver", {}).get("Name", "file"),
                "CreatedAt": result.get("CreatedAt", ""),
                "UpdatedAt": result.get("UpdatedAt", ""),
                "Spec": result.get("Spec", {})
            }
        else:
            result = run_podman_command(["secret", "inspect", secret_id])
            if not result or len(result) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Secret '{secret_id}' not found"
                )
            return result[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inspecting secret: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.delete("/api/secrets/{secret_id}")
async def delete_secret(secret_id: str, current_user: User = Depends(get_current_user)):
    """Delete a Podman secret."""
    try:
        if USE_HTTP_API:
            await http_api_request("DELETE", f"/secrets/{secret_id}")
            logger.info(f"Deleted secret: {secret_id}")
            return {"message": f"Secret '{secret_id}' deleted successfully"}
        else:
            cmd = ["podman"]
            
            # Add host/connection configuration if set
            if PODMAN_HOST:
                cmd.extend(["--host", PODMAN_HOST])
            elif PODMAN_CONNECTION:
                cmd.extend(["--connection", PODMAN_CONNECTION])
            
            cmd.extend(["secret", "rm", secret_id])
            
            subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Deleted secret: {secret_id}")
            return {"message": f"Secret '{secret_id}' deleted successfully"}
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to delete secret: {e.stderr}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete secret: {e.stderr}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting secret: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/health")
async def health_check():
    """Check Podman availability."""
    try:
        if USE_HTTP_API:
            # Use HTTP API for remote connections
            version_info = await http_api_request("GET", "/version")
            return {
                "podman_available": True,
                "version": version_info.get("Version", "unknown"),
                "host": PODMAN_HOST or "default",
                "connection": PODMAN_CONNECTION or "default",
                "mode": "HTTP API"
            }
        else:
            # Use CLI for local connections
            cmd = ["podman"]
            
            # Add host/connection configuration if set
            if PODMAN_HOST:
                cmd.extend(["--host", PODMAN_HOST])
            elif PODMAN_CONNECTION:
                cmd.extend(["--connection", PODMAN_CONNECTION])
            
            cmd.extend(["version", "--format", "json"])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            version_info = json.loads(result.stdout)
            return {
                "podman_available": True,
                "version": version_info.get("Client", {}).get("Version", "unknown"),
                "host": PODMAN_HOST or "default",
                "connection": PODMAN_CONNECTION or "default",
                "mode": "CLI"
            }
    except Exception as e:
        return {
            "podman_available": False,
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
