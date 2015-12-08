FROM    mascucsc/esescbase

RUN     apt-get update
RUN     apt-get install --no-install-recommends -y  sudo
RUN     apt-get install --no-install-recommends -y  nodejs
RUN     apt-get install --no-install-recommends -y  npm
RUN     apt-get install --no-install-recommends -y  mongodb
RUN     apt-get install --no-install-recommends -y  rubber
RUN     apt-get install --no-install-recommends -y  golang
RUN     apt-get install --no-install-recommends -y  git
RUN     apt-get install --no-install-recommends -y  curl
RUN     apt-get install --no-install-recommends -y  libcrypto++-dev
RUN     apt-get install --no-install-recommends -y  silversearcher-ag
RUN     apt-get install --no-install-recommends -y  texlive-full

RUN     curl -sSL https://get.docker.com/ | sh
RUN     ln -s /usr/bin/nodejs /usr/bin/node
RUN     npm install forever -g

RUN     mkdir -p /data/db
RUN     echo '%root ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN     echo '%docker ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

ENV     PYTHON python2.7
ENV     PATH   $PATH:/opt/liveos_terminal
ENV     PATH   $PATH:/root/.go/bin
ENV     GOPATH /root/.go/
ENV     TERM   xterm


EXPOSE  8079-8090

ADD     liveos /liveos

WORKDIR /liveos

RUN     npm install
RUN     install/csearch.sh
RUN     install/configure.sh
RUN     install/terminal.sh

RUN     apt-get clean
RUN     rm -rf /var/lib/apt/lists/*

VOLUME /var/lib/docker

CMD      service docker start && service mongodb start && install/docker.sh && ./boot.sh && /bin/bash
