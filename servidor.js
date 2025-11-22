const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const config = require("./config.json");

// Porta e configurações vindas do config.json
const PORT = config.porta || 8080;
const PASTA_BASE = "C:/new";

// 🔥 Pastas que NÃO devem aparecer na API
const PASTAS_IGNORAR = [".vscode", "node_modules"];

// Slug seguro para URLs
function slugify(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "") // Remove espaços
    .toLowerCase();
}

// Retorna somente as subpastas válidas
function pegarPastas() {
  try {
    return fs.readdirSync(PASTA_BASE, { withFileTypes: true })
      .filter(f => f.isDirectory() && !PASTAS_IGNORAR.includes(f.name))
      .map(f => f.name);
  } catch (e) {
    console.error("Erro ao ler diretórios:", e.message);
    return [];
  }
}

// API principal chamada pelo botão "Atualizar Materiais"
app.get("/listar", (req, res) => {
  try {
    const pastas = pegarPastas();
    const resposta = {};

    pastas.forEach(pasta => {
      const pastaCompleta = path.join(PASTA_BASE, pasta);
      const arquivos = [];

      try {
        fs.readdirSync(pastaCompleta, { withFileTypes: true })
          .filter(a => a.isFile() && a.name.toLowerCase().endsWith(".pdf"))
          .forEach(arq => {
            const fullPath = path.join(pastaCompleta, arq.name);
            const stats = fs.statSync(fullPath);

            arquivos.push({
              nome: arq.name,
              tamanho: stats.size,
              caminho: "/arquivo/" + slugify(pasta) + "/" + encodeURIComponent(arq.name)
            });
          });
      } catch (e) {
        console.error(`Erro ao listar arquivos em ${pasta}:`, e.message);
      }

      resposta[slugify(pasta)] = {
        displayName: pasta,
        arquivos
      };
    });

    res.json({
      erro: false,
      pastas: resposta
    });

  } catch (e) {
    res.status(500).json({
      erro: true,
      mensagem: "Falha ao listar pastas no servidor.",
      detalhes: e.message
    });
  }
});

// Endpoint que devolve cada PDF
app.get("/arquivo/:pasta/:nome", (req, res) => {
  const pastaSlug = req.params.pasta;
  const nomeArquivo = decodeURIComponent(req.params.nome);

  const pastas = pegarPastas();
  const pastaReal = pastas.find(p => slugify(p) === pastaSlug);

  if (!pastaReal) return res.status(404).send("Pasta de estudo não encontrada.");

  const caminho = path.join(PASTA_BASE, pastaReal, nomeArquivo);

  res.sendFile(caminho, err => {
    if (err) {
      console.error(`Erro ao enviar arquivo: ${caminho}`, err.message);
      res.status(404).send("Arquivo não encontrado.");
    }
  });
});

// Servir arquivos estáticos (HTML, JS, CSS)
app.use(express.static(__dirname));

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando no ambiente: ${config.ambiente}`);
  console.log(`→ Porta: ${PORT}`);
  console.log(`→ URL local: http://localhost:${PORT}`);
  console.log(`→ URL LAN:   http://${config.host_lan}:${PORT}`);
  console.log(`→ URL DDNS:  http://${config.host_ddns}:${PORT}`);
});
