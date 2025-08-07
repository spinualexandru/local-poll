# Check if the certs folder exists
if [ ! -d "certs" ]; then
  echo "Certs folder does not exist"
  echo "Press any key to continue..."
  read -n 1 -s
  mkdir -p certs
fi


if [ ! -f "certs/localhost-cert.pem" ]; then
  echo "Localhost certificate does not exist."
  echo "Attempting to run"
  echo "openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj /CN=localhost/ -keyout certs/localhost-privkey.pem -out certs/localhost-cert.pem"
  echo "Press any key to continue..."
  read -n 1 -s
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj /CN=localhost/ -keyout certs/localhost-privkey.pem -out certs/localhost-cert.pem
else
  echo "localhost-cert.pem already exists."
  echo "Skipping certificate generation."
  echo "Skipping private key generation."
fi
