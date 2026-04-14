const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Sirve archivos estáticos desde la raíz
app.use(express.static(__dirname));

// Ruta principal para servir el index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});