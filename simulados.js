/* ============================================================
   SIMULADOR FGV — TI
   Arquivo: simulados.js
============================================================ */

window.SIMULADOR_LOADED = true;

let dadosSimulado = null;
let dadosGabarito = null;

let questoes = [];
let respostas = {};           // {numeroQuestao: "A"}
let questaoAtual = 1;

let timerInterval = null;
let segundos = 0;
let provaIniciada = false;

/* ============================================================
   FUNÇÕES DE UTILIDADE
============================================================ */

function $(id) {
    return document.getElementById(id);
}

function formatarTempo(seg) {
    const h = String(Math.floor(seg / 3600)).padStart(2, "0");
    const m = String(Math.floor((seg % 3600) / 60)).padStart(2, "0");
    const s = String(seg % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
}

/* ============================================================
   CARREGAR ARQUIVOS JSON
============================================================ */

$("simulado-file").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
        try {
            dadosSimulado = JSON.parse(reader.result);
            const key = Object.keys(dadosSimulado)[0];
            questoes = dadosSimulado[key].questoes;

            $("quickStats").textContent = "Simulado carregado. Carregue o gabarito.";
            habilitarBotaoStart();
        } catch (e) {
            alert("Erro ao ler o arquivo de simulado. Verifique o formato JSON.");
        }
    };
    reader.readAsText(file);
});

$("gabarito-file").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
        try {
            dadosGabarito = JSON.parse(reader.result);
            const key = Object.keys(dadosGabarito)[0];
            dadosGabarito = dadosGabarito[key].respostas;

            $("quickStats").textContent = "Gabarito carregado. Pressione INICIAR.";
            habilitarBotaoStart();
        } catch (e) {
            alert("Erro ao ler o arquivo de gabarito. Verifique o formato JSON.");
        }
    };
    reader.readAsText(file);
});

/* Botão Start fica habilitado somente quando tudo estiver carregado */
function habilitarBotaoStart() {
    if (dadosSimulado && dadosGabarito) {
        $("btnStart").disabled = false;
    }
}

/* ============================================================
   INICIAR PROVA
============================================================ */

$("btnStart").addEventListener("click", function () {
    if (!dadosSimulado || !dadosGabarito) {
        alert("Carregue simulado e gabarito.");
        return;
    }

    provaIniciada = true;
    $("btnModoEstudo").disabled = true;
    $("resultsArea").style.display = "none";

    criarNavegacaoQuestoes();
    renderizarQuestao(1);

    entrarFullscreen();

    iniciarTimer();
});

/* ============================================================
   TIMER
============================================================ */

function iniciarTimer() {
    clearInterval(timerInterval);
    segundos = 0;

    timerInterval = setInterval(() => {
        segundos++;
        $("timer").textContent = formatarTempo(segundos);
    }, 1000);
}

/* ============================================================
   NAVEGAÇÃO ENTRE QUESTÕES
============================================================ */

function criarNavegacaoQuestoes() {
    const nav = $("navQuestions");
    nav.innerHTML = "";

    questoes.forEach(q => {
        const btn = document.createElement("button");
        btn.textContent = q.numero;
        btn.id = "navQ" + q.numero;

        btn.addEventListener("click", () => {
            questaoAtual = q.numero;
            renderizarQuestao(q.numero);
        });

        nav.appendChild(btn);
    });
}

function atualizarNavegacao() {
    questoes.forEach(q => {
        const btn = $("navQ" + q.numero);
        btn.classList.remove("atual");
        btn.classList.remove("respondida");

        if (q.numero === questaoAtual) {
            btn.classList.add("atual");
        }
        if (respostas[q.numero]) {
            btn.classList.add("respondida");
        }
    });
}


/* ============================================================
   RENDERIZAR QUESTÃO
============================================================ */

function renderizarQuestao(numero) {
    questaoAtual = numero;
    const q = questoes.find(x => x.numero === numero);

    if (!q) return;

    const area = $("simuladoArea");
    area.innerHTML = ""; // mostra APENAS a questão atual (correto)

    const card = document.createElement("div");
    card.className = "question-card";

    // Título
    const h = document.createElement("h2");
    h.textContent = `Questão ${q.numero}`;
    card.appendChild(h);

    // Enunciado
    const p = document.createElement("p");
    p.style.marginBottom = "16px";
    p.textContent = q.enunciado;
    card.appendChild(p);

    // Alternativas
    const divAlt = document.createElement("div");
    divAlt.className = "alternativas";

    for (let letra in q.alternativas) {
        const btn = document.createElement("button");
        btn.className = "alt-btn";
        btn.textContent = `${letra}) ${q.alternativas[letra]}`;

        // ✔ NÃO marca mais selecionada automaticamente
        // Apenas cor neutra

        btn.addEventListener("click", () => selecionarAlternativa(q.numero, letra));

        divAlt.appendChild(btn);
    }

    card.appendChild(divAlt);

    // Controles inferiores
    const footer = document.createElement("div");
    footer.className = "footer-actions";

    if (numero > 1) {
        const btnAnt = document.createElement("button");
        btnAnt.className = "btn ghost";
        btnAnt.textContent = "⬅️ Anterior";
        btnAnt.onclick = () => renderizarQuestao(numero - 1);
        footer.appendChild(btnAnt);
    }

    if (numero < questoes.length) {
        const btnProx = document.createElement("button");
        btnProx.className = "btn";
        btnProx.textContent = "Próxima ➡️";
        btnProx.onclick = () => renderizarQuestao(numero + 1);
        footer.appendChild(btnProx);
    } else {
        const btnFinal = document.createElement("button");
        btnFinal.className = "btn";
        btnFinal.textContent = "Finalizar Prova";
        btnFinal.onclick = finalizarProva;
        footer.appendChild(btnFinal);
    }

    card.appendChild(footer);

    area.appendChild(card);

    atualizarNavegacao();
}


/* ============================================================
   SELEÇÃO DE ALTERNATIVA
============================================================ */

function selecionarAlternativa(num, letra) {
    respostas[num] = letra;
    salvarProgresso();

    // Remove seleção anterior
    document.querySelectorAll(".alt-btn").forEach(b => {
        b.classList.remove("selecionada");
    });

    // Marca a clicada
    const botoesQuestao = document.querySelectorAll("#simuladoArea .alt-btn");
    botoesQuestao.forEach(btn => {
        if (btn.textContent.startsWith(letra)) {
            btn.classList.add("selecionada");
        }
    });
}


/* ============================================================
   SALVAR PROGRESSO (localStorage)
============================================================ */

function salvarProgresso() {
    const data = {
        respostas,
        segundos,
        questaoAtual
    };
    localStorage.setItem("simuladoFGV", JSON.stringify(data));
}

function carregarProgresso() {
    const data = localStorage.getItem("simuladoFGV");
    if (!data) return;

    try {
        const obj = JSON.parse(data);
        respostas = obj.respostas || {};
        segundos = obj.segundos || 0;
        questaoAtual = obj.questaoAtual || 1;
    } catch {}
}

/* ============================================================
   FINALIZAR PROVA
============================================================ */

function finalizarProva() {
    clearInterval(timerInterval);

    let acertos = 0;
    let total = questoes.length;

    questoes.forEach(q => {
        const resp = respostas[q.numero];
        const correta = dadosGabarito[q.numero];

        if (resp && resp === correta) {
            acertos++;
        }
    });

    const perc = ((acertos / total) * 100).toFixed(1);

    $("summary").innerHTML = `
        <p><strong>Tempo total:</strong> ${formatarTempo(segundos)}</p>
        <p><strong>Acertos:</strong> ${acertos} / ${total} (${perc}%)</p>
    `;
    // ================================
// SALVAR QUESTÕES ERRADAS PARA FLASHCARDS
// ================================
let erradas = [];

questoes.forEach(q => {
    const resp = respostas[q.numero];
    const correta = dadosGabarito[q.numero];

    if (resp !== correta) {
        erradas.push({
            numero: q.numero,
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            escolhida: resp,
            correta: correta
        });
    }
});

// Salva no localStorage para abrir na outra janela
localStorage.setItem("flashcardsErradasFGV", JSON.stringify(erradas));

// Abre flashcards em outra aba
window.open("flashcards.html", "_blank");


    $("resultsArea").style.display = "block";

    desenharRadar(acertos, total);

    $("btnModoEstudo").disabled = false;
}

/* ============================================================
   MODO ESTUDO — mostrar apenas erradas
============================================================ */

$("btnModoEstudo").addEventListener("click", function () {
    const area = $("simuladoArea");
    area.innerHTML = "";

    questoes.forEach(q => {
        const resp = respostas[q.numero];
        const correta = dadosGabarito[q.numero];

        if (resp === correta) return; // mostra só erradas

        const card = document.createElement("div");
        card.className = "question-card";

        const h = document.createElement("h2");
        h.textContent = `Questão ${q.numero}`;
        card.appendChild(h);

        const p = document.createElement("p");
        p.textContent = q.enunciado;
        card.appendChild(p);

        const divAlt = document.createElement("div");
        divAlt.className = "alternativas";

        for (let letra in q.alternativas) {
            const btn = document.createElement("div");
            btn.className = "alt-btn";
            btn.textContent = `${letra}) ${q.alternativas[letra]}`;

            if (letra === correta) btn.classList.add("certa");
            if (letra === resp && resp !== correta) btn.classList.add("errada");

            divAlt.appendChild(btn);
        }

        card.appendChild(divAlt);
        area.appendChild(card);
    });
});

/* ============================================================
   TELA CHEIA
============================================================ */

$("btnFullscreen").addEventListener("click", entrarFullscreen);

function entrarFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
}

/* ============================================================
   GRÁFICO RADAR (CANVAS PURO)
============================================================ */

function desenharRadar(acertos, total) {
    const canvas = $("radarChart");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const perc = acertos / total;

    ctx.beginPath();
    ctx.arc(240, 160, 80, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(90,169,255,0.35)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(240, 160, 80 * perc, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,208,255,0.8)";
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "20px Inter";
    ctx.textAlign = "center";
    ctx.fillText(`${(perc * 100).toFixed(1)}%`, 240, 165);
}

/* ============================================================
   RESET
============================================================ */

$("btnReset").addEventListener("click", function () {
    localStorage.removeItem("simuladoFGV");
    location.reload();
});

/* ============================================================
   CARREGAR PROGRESSO AO ABRIR A PÁGINA
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    carregarProgresso();
});
