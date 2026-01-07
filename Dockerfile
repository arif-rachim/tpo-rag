# 1. Base image
FROM 156.1.161.56:8082/jacrag-windows-base:1.0.0

# 2. Set working directory inside container
WORKDIR /app

# 3. copy files from host to container
COPY public/ /app/public
COPY src/ /app/src
COPY .env .
COPY .python-version .
COPY pyproject.toml .
COPY requirements.txt .

# 4 Install packages
RUN mkdir /data
RUN pip install uv --index-url http://156.1.161.56:8081/repository/esnaad-pypy/simple/ --trusted-host 156.1.161.56
RUN uv venv
RUN uv pip install -r requirements.txt --native-tls --trusted-host jmodl1aitfs01.jac.mil.ae

# 5 Start the application
CMD [".venv/Scripts/python.exe","./src/main.py"]