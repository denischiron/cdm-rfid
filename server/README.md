# cdm-rfid
RFID detection : server mode

1- Brancher le boitier ID_Capt sur le réseau où se trouve le PC
Noter l'IPdu boitier qui servira à plusieurs endroits.

2- Se connecter au boitier via un navigateur :
http://idcapt_00000000.local/
Identifiants : admin / admin (deux fois)

3- Dans cette interface, configurer le mode TCP serveur via l'option "Configure TCP/UDP"

4- Attribuer un port de communication TCP vers le PC (Ex: 1300)

5- Passer le boitier en mode "Manuel" :

Ce permet d'interroger le boitier à la demande.

Passer en mode "manuel" peut se faire via le script (dans le dossier "commands") : 

node tcp_commande_192_168_1_160_MANUEL.js  

RQ : Dans le script NodeJS, est indiqué l'IP du boitier (Ex : 192.168.1.160)


6- Tester le service :

- Installer NodeJS si nécessaire

node tcp_tag_listener_server_mode.js

Cela affiche l'ID d'un tag, ou bien N/A si aucun tag n'est présent 


7- Installer le service Windows :

- Installer NodeJS si nécessaire

- Installer qckwinsvc2 ( https://github.com/suyeonORG/qckwinsvc2/blob/main/README.md ) :
npm i qckwinsvc2 -g

- Installer le service
qckwinsvc2 install name="RFID_TCP_listener_server_mode" description="RFID tag listener - server mode"
(Demande le chemin du script Node)

- Démarrer le service 
qckwinsvc2 start name="RFID_TCP_listener_server_mode"

Un dossier "daemon" contient les fichiers de logs (erreur, output).
