FROM ubuntu:18.04

RUN apt-get -qqy update \
&& apt-get -qqy install curl < /dev/null > /dev/null

RUN curl -sSL https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -o /tmp/miniconda.sh \
&& bash /tmp/miniconda.sh -bfp /usr/local \
&& rm -rf /tmp/miniconda.sh \
&& conda install -y -q python=3.6 \
&& conda update -y -q -n base conda \
&& apt-get -qqy autoremove \
&& rm -rf /var/lib/apt/lists/* /var/log/dpkg.log \
&& conda clean --all --yes \
&& conda config --add channels conda-forge 

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - \
&& apt-get -qqy install nodejs

ENV PATH /opt/conda/bin:$PATH

WORKDIR /usr/src/app

COPY . .

RUN conda install --file requirements.txt

WORKDIR /usr/src/app/app

CMD [ "python", "./app.py" ]
