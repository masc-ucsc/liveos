echo -e "\e[1m \e[32m"
echo --------Building Arch Docker--------
echo -e "\e[39m \e[0m"

cd Arch\ Terminal\ Docker/ 
docker build --no-cache -t live/arch_terminal_docker_image .
cd ..

echo -e "\e[1m \e[32m"
echo --------Building GIT RW Docker--------
echo -e "\e[39m \e[0m"

cd Git\ Ubuntu\ Docker/ 
docker build --no-cache -t live/ubuntu_git_image .
cd ..

echo -e "\e[1m \e[32m"
echo --------Building Ubuntu Docker--------
echo -e "\e[39m \e[0m"

cd Ubuntu\ Terminal\ Docker/
docker build --no-cache -t live/ubuntu_terminal_docker_image .
cd ..

echo -e "\e[1m \e[32m"
echo --------Building Project Dockers--------
echo -e "\e[39m \e[0m"

cd Project\ Docker/
docker build --no-cache -t live/project_docker .

cd ..

echo -e "\e[1m \e[32m"
echo --------Building PubPriv Docker--------
echo -e "\e[39m \e[0m"

cd Pub_priv\ Git\ Docker/
docker build --no-cache -t live/project_docker .
docker build -t live/pub_priv_git_docker .

