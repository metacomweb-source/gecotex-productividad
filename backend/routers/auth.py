from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from auth import verify_password, create_access_token, get_current_user
from models.usuario import Usuario
from schemas.usuario import LoginRequest, TokenResponse, UsuarioResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    print(f"DEBUG: Intento de login para: {data.email}")
    usuario = db.query(Usuario).filter(Usuario.email == data.email, Usuario.activo == True).first()
    if not usuario:
        print(f"DEBUG: Usuario no encontrado: {data.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    
    verified = verify_password(data.password, usuario.password_hash)
    print(f"DEBUG: Verificación de password para {data.email}: {verified}")
    
    if not verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    
    token = create_access_token({"sub": str(usuario.id)})
    return TokenResponse(
        access_token=token,
        usuario=UsuarioResponse.model_validate(usuario),
    )


@router.post("/logout")
def logout(current_user: Usuario = Depends(get_current_user)):
    return {"message": "Sesión cerrada correctamente"}


@router.get("/me", response_model=UsuarioResponse)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user
