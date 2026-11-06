
// ============================================================
// ESPAÇO GEISCH ARAÚJO
// SISTEMA DE AGENDAMENTO
// ============================================================

// URL ORIGINAL DO GOOGLE APPS SCRIPT
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbxkwXZfNqKix5qmrdJLFQk32HT2WIi0W6NNYvCiCYF7cezDcbJ-iN6B2bwwrtUEq8u3/exec";

const SENHA_MESTRE = "Davi07";

const INICIO_EXPEDIENTE = 9 * 60;
const FIM_EXPEDIENTE = 20 * 60;
const INTERVALO_OPCOES = 20;
const FUSO_HORARIO = "America/Sao_Paulo";

let agendamentos = [];
let agendamentosAtivos = [];


// ============================================================
// DATA E HORÁRIO DE SÃO PAULO
// ============================================================

function obterAgoraSaoPaulo() {

    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: FUSO_HORARIO,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const p = Object.fromEntries(
        partes.map(parte => [parte.type, parte.value])
    );

    return {
        data: `${p.year}-${p.month}-${p.day}`,
        minutos: Number(p.hour) * 60 + Number(p.minute)
    };
}


function obterDataHojeSaoPaulo() {
    return obterAgoraSaoPaulo().data;
}


function obterMinutosAtuaisSaoPaulo() {
    return obterAgoraSaoPaulo().minutos;
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    bloquearDatasPassadas();

    await carregarAgendamentosGoogleSheets();

    atualizarListaUI();

});


// ============================================================
// BLOQUEAR DATAS ANTERIORES
// ============================================================

function bloquearDatasPassadas() {

    const campoData = document.getElementById("data");

    campoData.min = obterDataHojeSaoPaulo();

}


// ============================================================
// PADRONIZAÇÃO DE DATA
// ============================================================

function normalizarDataISO(valor) {

    if (!valor) return "";

    const texto = String(valor).trim();

    let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (m) {
        return `${m[1]}-${m[2]}-${m[3]}`;
    }

    m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (m) {
        return `${m[3]}-${m[2]}-${m[1]}`;
    }

    const data = new Date(valor);

    if (!Number.isNaN(data.getTime())) {

        const partes = new Intl.DateTimeFormat("en-CA", {
            timeZone: FUSO_HORARIO,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(data);

        const p = Object.fromEntries(
            partes.map(parte => [parte.type, parte.value])
        );

        return `${p.year}-${p.month}-${p.day}`;
    }

    return "";
}


function formatarDataBR(valor) {

    const iso = normalizarDataISO(valor);

    if (!iso) return "";

    const [ano, mes, dia] = iso.split("-");

    return `${dia}/${mes}/${ano}`;

}


// ============================================================
// PADRONIZAÇÃO DE HORÁRIO
// ============================================================

function normalizarHora(valor) {

    if (!valor) return "";

    const texto = String(valor).trim();

    const m = texto.match(
        /(?:^|\D)(\d{1,2}):(\d{2})(?::\d{2})?(?:\D|$)/
    );

    if (!m) return "";

    return `${m[1].padStart(2, "0")}:${m[2]}`;

}


function formatarHoraLimpa(valor) {

    return normalizarHora(valor) || "--:--";

}


function horaParaMinutos(hora) {

    const limpa = normalizarHora(hora);

    if (!limpa) return NaN;

    const [h, m] = limpa.split(":").map(Number);

    return h * 60 + m;

}


function minutosParaHora(total) {

    const h = Math.floor(total / 60)
        .toString()
        .padStart(2, "0");

    const m = (total % 60)
        .toString()
        .padStart(2, "0");

    return `${h}:${m}`;

}


// ============================================================
// NORMALIZAR AGENDAMENTOS RECEBIDOS DO GOOGLE
// ============================================================

function normalizarAgendamento(item) {

    return {

        nome: String(item.nome || item.cliente || "").trim(),

        servico: String(item.servico || "").trim(),

        data: normalizarDataISO(item.data),

        hora: normalizarHora(item.hora || item.horario),

        duracao: Math.max(
            1,
            parseInt(item.duracao, 10) || 60
        )

    };

}


// ============================================================
// CARREGAR AGENDAMENTOS DO GOOGLE SHEETS
// ============================================================

async function carregarAgendamentosGoogleSheets() {

    if (!URL_GOOGLE_SCRIPT) return;

    try {

        const resposta = await fetch(
            URL_GOOGLE_SCRIPT,
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!resposta.ok) {
            throw new Error("Erro ao consultar a planilha.");
        }

        const dados = await resposta.json();

        if (!Array.isArray(dados)) {
            throw new Error("Formato de resposta inválido.");
        }

        agendamentos = dados
            .map(normalizarAgendamento)
            .filter(item => item.data && item.hora && item.nome);

    }

    catch (erro) {

        console.error(
            "Erro ao carregar Google Sheets:",
            erro
        );

    }

}


// ============================================================
// COPIAR CHAVE PIX
// ============================================================

function copiarPix() {

    const campo = document.getElementById("chave-pix");

    campo.select();

    campo.setSelectionRange(0, 99999);

    if (navigator.clipboard && window.isSecureContext) {

        navigator.clipboard.writeText(campo.value)
            .then(() => alert("Chave Pix copiada com sucesso!"))
            .catch(() => alert("Não foi possível copiar automaticamente."));

    } else {

        document.execCommand("copy");

        alert("Chave Pix copiada com sucesso!");

    }

}


// ============================================================
// IDENTIFICAR DURAÇÃO DO SERVIÇO
// ============================================================

function obterDuracaoServico() {

    const select = document.getElementById("servico");

    const opcao = select.options[select.selectedIndex];

    return opcao
        ? parseInt(opcao.getAttribute("data-tempo"), 10) || 0
        : 0;

}


// ============================================================
// VERIFICAR CONFLITOS DE HORÁRIOS
// ============================================================

function existeConflito(data, inicio, fim, lista = agendamentos) {

    return lista.some(item => {

        if (normalizarDataISO(item.data) !== data) {
            return false;
        }

        const inicioExistente = horaParaMinutos(item.hora);

        if (!Number.isFinite(inicioExistente)) {
            return false;
        }

        const duracaoExistente =
            parseInt(item.duracao, 10) || 60;

        const fimExistente =
            inicioExistente + duracaoExistente;

        return (
            inicio < fimExistente &&
            fim > inicioExistente
        );

    });

}


// ============================================================
// ATUALIZAR HORÁRIOS DISPONÍVEIS
// ============================================================

function atualizarHorariosDisponiveis() {

    const campoData = document.getElementById("data");

    const selectHora = document.getElementById("hora");

    const dataSelecionada = campoData.value;

    const duracao = obterDuracaoServico();

    selectHora.innerHTML = "";

    if (
        !document.getElementById("servico").value ||
        !dataSelecionada ||
        !duracao
    ) {

        selectHora.innerHTML =
            '<option value="" disabled selected>Selecione o serviço e a data primeiro</option>';

        return;

    }


    const [ano, mes, dia] =
        dataSelecionada.split("-").map(Number);

    const diaSemana =
        new Date(ano, mes - 1, dia).getDay();


    if (diaSemana === 0 || diaSemana === 1) {

        alert(
            "Nosso atendimento é de terça-feira a sábado, das 09h às 20h."
        );

        campoData.value = "";

        selectHora.innerHTML =
            '<option value="" disabled selected>Selecione uma data válida</option>';

        return;

    }


    const opcaoInicial = document.createElement("option");

    opcaoInicial.value = "";

    opcaoInicial.disabled = true;

    opcaoInicial.selected = true;

    opcaoInicial.textContent = "Selecione o horário";

    selectHora.appendChild(opcaoInicial);


    const agora = obterAgoraSaoPaulo();


    for (
        let inicio = INICIO_EXPEDIENTE;
        inicio < FIM_EXPEDIENTE;
        inicio += INTERVALO_OPCOES
    ) {

        const fim = inicio + duracao;


        // Não permite ultrapassar as 20h.

        if (fim > FIM_EXPEDIENTE) {
            continue;
        }


        // Não oferece horários que já começaram.

        if (
            dataSelecionada === agora.data &&
            inicio <= agora.minutos
        ) {
            continue;
        }


        // Verifica se existe outro agendamento no período.

        if (
            existeConflito(
                dataSelecionada,
                inicio,
                fim
            )
        ) {
            continue;
        }


        const opcao = document.createElement("option");

        opcao.value = minutosParaHora(inicio);

        opcao.textContent = minutosParaHora(inicio);

        selectHora.appendChild(opcao);

    }


    if (selectHora.options.length === 1) {

        const indisponivel =
            document.createElement("option");

        indisponivel.disabled = true;

        indisponivel.textContent =
            "Nenhum horário disponível para este serviço";

        selectHora.appendChild(indisponivel);

    }

}


// ============================================================
// ABRIR E FECHAR PAINEL ADMINISTRATIVO
// ============================================================

async function toggleAgenda() {

    const secao =
        document.getElementById("secao-agenda");

    const botao =
        document.getElementById("btn-verificar");


    if (!secao.classList.contains("oculto")) {

        secao.classList.add("oculto");

        botao.textContent = "🔒 Área Administrativa";

        return;

    }


    const senha = prompt(
        "Digite a senha de administrador para acessar:"
    );


    if (senha !== SENHA_MESTRE) {

        if (senha !== null) {
            alert("Senha incorreta! Acesso negado.");
        }

        return;

    }


    await carregarAgendamentosGoogleSheets();

    atualizarListaUI();

    secao.classList.remove("oculto");

    botao.textContent = "🔓 Fechar Área Restrita";

}


// ============================================================
// CONFIRMAR AGENDAMENTO
// ============================================================

async function agendar() {

    const nome =
        document.getElementById("nome").value.trim();

    const selectServico =
        document.getElementById("servico");

    const servico = selectServico.value;

    const data =
        document.getElementById("data").value;

    const hora =
        document.getElementById("hora").value;

    const duracao = obterDuracaoServico();


    if (!nome || !servico || !data || !hora) {

        alert("Por favor, preencha todos os campos!");

        return;

    }


    const inicio = horaParaMinutos(hora);

    const fim = inicio + duracao;

    const agora = obterAgoraSaoPaulo();


    if (fim > FIM_EXPEDIENTE) {

        alert(
            "Este serviço ultrapassa o horário de encerramento."
        );

        atualizarHorariosDisponiveis();

        return;

    }


    if (
        data < agora.data ||
        (data === agora.data && inicio <= agora.minutos)
    ) {

        alert(
            "Este horário já passou. Escolha outro horário."
        );

        atualizarHorariosDisponiveis();

        return;

    }


    if (existeConflito(data, inicio, fim)) {

        alert(
            "Este horário acabou de ficar indisponível. Escolha outro."
        );

        await carregarAgendamentosGoogleSheets();

        atualizarHorariosDisponiveis();

        return;

    }


    const novo = {
        nome,
        servico,
        data,
        hora,
        duracao
    };


    try {

        await fetch(URL_GOOGLE_SCRIPT, {

            method: "POST",

            mode: "no-cors",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({
                action: "add",
                ...novo
            })

        });


        agendamentos.push(novo);

        atualizarListaUI();


        const dataFormatada = formatarDataBR(data);

        const numeroWhatsapp = "5511981018939";

        const chavePix = "34385500835";


        const mensagem =

            `✨ *SOLICITAÇÃO DE AGENDAMENTO* ✨\n\n` +

            `👤 *Cliente:* ${nome}\n` +

            `💅 *Serviço:* ${servico}\n` +

            `📅 *Data:* ${dataFormatada}\n` +

            `⏰ *Horário:* ${hora}\n\n` +

            `💵 *Sinal de Agendamento:* R$ 30,00\n` +

            `🔑 *Chave Pix (CPF):* ${chavePix}\n\n` +

            `📌 *Aviso:* Enviarei o comprovante do Pix de R$ 30,00 a seguir para confirmar meu agendamento. Estou ciente de que, em caso de não comparecimento, o valor não será ressarcido.`;


        const urlWhatsapp =
            `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagem)}`;


        document.getElementById("nome").value = "";

        document.getElementById("servico").value = "";

        document.getElementById("data").value = "";

        document.getElementById("hora").innerHTML =
            '<option value="" disabled selected>Selecione o serviço e a data primeiro</option>';


        window.open(urlWhatsapp, "_blank");


        setTimeout(async () => {

            await carregarAgendamentosGoogleSheets();

            atualizarListaUI();

        }, 1500);


    }

    catch (erro) {

        console.error(
            "Erro ao enviar agendamento:",
            erro
        );

        alert(
            "Não foi possível enviar o agendamento. Tente novamente."
        );

    }

}


// ============================================================
// CANCELAR AGENDAMENTO
// ============================================================

async function cancelarAgendamento(indexAtivo) {

    const item = agendamentosAtivos[indexAtivo];

    if (!item) return;


    if (!confirm(
        "Tem certeza que deseja cancelar este agendamento? Ele será excluído da planilha."
    )) {
        return;
    }


    try {

        await fetch(URL_GOOGLE_SCRIPT, {

            method: "POST",

            mode: "no-cors",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({
                action: "delete",
                ...item
            })

        });


        agendamentos = agendamentos.filter(registro =>

            !(
                registro.nome === item.nome &&
                registro.servico === item.servico &&
                registro.data === item.data &&
                registro.hora === item.hora
            )

        );


        atualizarListaUI();

        atualizarHorariosDisponiveis();


    }

    catch (erro) {

        console.error(
            "Erro ao cancelar agendamento:",
            erro
        );

        alert(
            "Não foi possível enviar o cancelamento."
        );

    }

}


// ============================================================
// PROTEÇÃO DE TEXTO NA EXIBIÇÃO
// ============================================================

function escaparHTML(valor) {

    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

    })[caractere]);

}


// ============================================================
// ATUALIZAR PAINEL ADMINISTRATIVO
// ============================================================

function atualizarListaUI() {

    const lista =
        document.getElementById("lista-agendamento");

    lista.innerHTML = "";


    const agora = obterAgoraSaoPaulo();


    // Os agendamentos vencidos são ocultados do painel.
    // Eles continuam salvos na planilha Google Sheets.

    agendamentosAtivos = agendamentos.filter(item => {

        const data = normalizarDataISO(item.data);

        const inicio = horaParaMinutos(item.hora);

        const duracao =
            parseInt(item.duracao, 10) || 60;


        if (!data || !Number.isFinite(inicio)) {
            return false;
        }


        if (data > agora.data) {
            return true;
        }


        if (data < agora.data) {
            return false;
        }


        return (inicio + duracao) > agora.minutos;

    });


    // Ordenar por data e horário.

    agendamentosAtivos.sort((a, b) => {

        return (
            a.data.localeCompare(b.data) ||
            a.hora.localeCompare(b.hora)
        );

    });


    if (agendamentosAtivos.length === 0) {

        lista.innerHTML =
            "<li>Nenhum horário reservado no momento.</li>";

        return;

    }


    agendamentosAtivos.forEach((item, index) => {

        const li = document.createElement("li");


        li.innerHTML = `

            <div class="info-cliente">

                <strong>
                    Cliente: ${escaparHTML(item.nome)}
                </strong>

                <span>
                    ✨ Serviço: ${escaparHTML(item.servico)}
                </span>

                <span>
                    ⏱️ Duração: ${item.duracao} minutos
                </span>

                <small>
                    📅 Data: ${formatarDataBR(item.data)}
                    |
                    ⏰ Horário: ${formatarHoraLimpa(item.hora)}
                </small>

            </div>

            <button
                class="btn-cancelar"
                onclick="cancelarAgendamento(${index})"
            >
                Cancelar
            </button>

        `;


        lista.appendChild(li);

    });

}
