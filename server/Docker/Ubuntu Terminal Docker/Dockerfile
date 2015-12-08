#base ubuntu install
FROM ubuntu

# Install Node.js and npm etc..
RUN     apt-get -y update
RUN		  apt-get -y upgrade
RUN     apt-get -y install nodejs
#RUN     apt-get -y install python2
RUN     apt-get -y install make
RUN     apt-get -y install gcc
RUN     apt-get -y install vim
RUN     apt-get -y install tmux

RUN     echo '%docker ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
ENV     PYTHON python2.7
ENV		  PATH $PATH:/.liveos_terminal
ENV     TERM xterm

RUN     PS1='\u \W$ '; unset PROMPT_COMMAND

#launch this arch image with a bash shell. Remember: interactive (cmd line persistence) mode is handled by the command that launches this docker
#CMD echo PS1=\'\\u \\W$ \' >> /etc/bash.bashrc && unset PROMPT_COMMAND && /bin/bash 
CMD echo PS1=\'\\u \\W$ \' >> /etc/bash.bashrc && /bin/bash 
