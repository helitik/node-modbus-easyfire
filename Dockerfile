# Utilise une image Node légère
FROM node:18-alpine

# Dossier de travail
WORKDIR /app

# Copie des fichiers
COPY package*.json ./
COPY . .

# Installe les dépendances
RUN npm install

# Expose le port de l'app
EXPOSE 3000

# Démarre le projet
CMD ["npm", "start"]
