# create a fast api endpoint that returns a json response with a message "Hello, World!"
from fastapi import FastAPI
from fastapi.responses import JSONResponse


app = FastAPI()

@app.get("/")
async def root():
    return JSONResponse(content={"message": "Hello, World!"})

print("FastAPI app is running...")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, World!"}

if __name__ == "__main__":
    test_root()
    print("Test passed!")