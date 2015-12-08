#base ubuntu install
FROM ubuntu

# Install Node.js and npm etc..
RUN     apt-get -y update
RUN     apt-get -y install nodejs
RUN     apt-get -y install make
RUN     apt-get -y install gcc
RUN     apt-get -y install vim
RUN     apt-get -y install git
RUN     mkdir /root/.ssh/
RUN     touch /root/.ssh/known_hosts
RUN     apt-get -y install tmux

ENV     PYTHON python2.7
RUN     PS1='\u \W$ '; unset PROMPT_COMMAND

#launch this arch image with a bash shell. Remember: interactive (cmd line persistence '-it') mode is handled by the command that launches this docker
CMD echo PS1=\'\\u \\W$ \' >> /etc/bash.bashrc && unset PROMPT_COMMAND && /bin/bash 