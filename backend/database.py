from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from models import usuario, tipo_dua, incrementador, expediente, sesion_trabajo, objetivo_mes, parametros_bonus, notificacion, importacion_excel
    from models import config_bonus_global, factores_evaluacion, evaluaciones_bonus, respuestas_factores
    from models import cola_trabajo
    Base.metadata.create_all(bind=engine)
