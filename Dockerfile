# install node 12
# https://hub.docker.com/_/node/
FROM node:12

# create and set app directory
RUN mkdir -p /usr/gamegoldnode/
RUN mkdir -p /usr/gamegoldnode/.gamegold/
WORKDIR /usr/gamegoldnode/

# install app dependencies
# this is done before the following COPY command to take advantage of layer caching
COPY package*.json ./
RUN npm install


# copy app source to destination container
COPY . .

VOLUME ["/usr/gamegoldnode/.gamegold/"]

# expose container port
EXPOSE 2100
EXPOSE 2101
EXPOSE 2102
EXPOSE 2104
EXPOSE 2105

ENTRYPOINT node /usr/gamegoldnode/index.js \
--bip150=true --bip151=true \
--genesis --network=testnet \
--password=bookmansoft \
$0 $@