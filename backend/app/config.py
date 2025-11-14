import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-key")
    DEBUG = True
