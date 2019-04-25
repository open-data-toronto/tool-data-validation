FROM python:3.6

WORKDIR /usr/src/app

RUN apt update
RUN apt install python3-rtree -y

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD [ "python", "./app.py" ]
