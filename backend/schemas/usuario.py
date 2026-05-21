from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from models.usuario import RolEnum, DepartamentoEnum


class UsuarioBase(BaseModel):
    nombre: str
    apellidos: str
    email: EmailStr
    rol: RolEnum
    departamento: Optional[DepartamentoEnum] = None
    fecha_incorporacion: Optional[date] = None
    activo: bool = True
    jornada_horas_dia: float = 8.0


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[RolEnum] = None
    departamento: Optional[DepartamentoEnum] = None
    fecha_incorporacion: Optional[date] = None
    activo: Optional[bool] = None
    jornada_horas_dia: Optional[float] = None
    password: Optional[str] = None


class UsuarioResponse(UsuarioBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse
