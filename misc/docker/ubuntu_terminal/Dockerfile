FROM    mascucsc/esescbase

RUN     apt-get update
RUN     apt-get install --no-install-recommends -y sudo \
		    libcrypto++-dev \
		    git \
        vim

RUN     groupadd docker
RUN     echo '%root ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN     echo '%docker ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

ENV     PATH   $PATH:/opt/liveos_terminal
ENV     TERM   xterm

ADD     source /source
ADD     liveos_terminal /opt/liveos_terminal

RUN     make -C /source
RUN     mv /source/terminal_binary /opt/liveos_terminal/terminal_binary
RUN     ln -s  /opt/liveos_terminal/terminal_binary  /opt/liveos_terminal/_edit
RUN     ln -s  /opt/liveos_terminal/terminal_binary  /opt/liveos_terminal/_kill
RUN     ln -s  /opt/liveos_terminal/terminal_binary  /opt/liveos_terminal/_git
RUN     ln -s  /opt/liveos_terminal/terminal_binary  /opt/liveos_terminal/_livesim

RUN     rm -rf /source

RUN     apt-get clean
RUN     rm -rf /var/lib/apt/lists/*

CMD echo PS1=\'\\u \\W$ \' >> /etc/bash.bashrc && /bin/bash
