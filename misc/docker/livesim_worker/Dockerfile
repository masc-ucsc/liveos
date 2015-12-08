#base arch install with alpm fix installed
FROM    mascucsc/esescbase

# Install Node.js and npm etc..
RUN     apt-get update
RUN     apt-get install --no-install-recommends -y \
        git \
        nodejs \
        npm

RUN     ln -s /usr/bin/nodejs /usr/bin/node
RUN     npm install forever -g

ADD     run_files /run_files

RUN     git clone git://github.com/masc-ucsc/esesc.git
RUN     mkdir /build
RUN     cd /build && cmake ../esesc -DENABLE_LIVE=1 && make && make live
RUN     mkdir /build/run
RUN     cp /esesc/conf/* /build/run/.
RUN     cp -r /esesc/bins/* /build/run/.
RUN     cp -rf /run_files/* /build/run/.
RUN     npm install

ENV     TERM   xterm

#RUN     npm install

#RUN     apt-get clean
#RUN     rm -rf /var/lib/apt/lists/*

#launch this arch image with a bash shell. Remember: interactive (cmd line persistence) mode is handled by the command that launches this docker
CMD      forever -o log.out -e log.err start controller.js && /bin/bash
