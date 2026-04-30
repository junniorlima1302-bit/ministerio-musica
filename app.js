//////////////////////////////////////////////////////
// NORMALIZAR TEXTO
//////////////////////////////////////////////////////

function normalizar(texto) {
  return texto
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

//////////////////////////////////////////////////////
// NAVEGAÇÃO
//////////////////////////////////////////////////////

let historico = JSON.parse(localStorage.getItem("historico")) || [];

function irPara(pagina) {
  historico.push(window.location.pathname);
  localStorage.setItem("historico", JSON.stringify(historico));
  window.location.href = pagina;
}

function voltarSistema() {
  let historico = JSON.parse(localStorage.getItem("historico")) || [];
  const ultima = historico.pop();
  localStorage.setItem("historico", JSON.stringify(historico));
  window.location.href = ultima || "index.html";
}

function voltarPagina() {
  voltarSistema();
}

//////////////////////////////////////////////////////
// IDENTIFICAÇÃO
//////////////////////////////////////////////////////

function continuar() {
  const nome = document.getElementById("nome")?.value;
  const ministerioSelecionado = document.querySelector('input[name="ministerio"]:checked');
  const tipoSelecionado = document.querySelector('input[name="tipo"]:checked');
  const instrumento = document.getElementById("instrumento")?.value;

  if (!nome || !ministerioSelecionado) {
    alert("Preencha seu nome e selecione o ministério.");
    return;
  }

  if (!tipoSelecionado) {
    alert("Selecione se você canta ou toca.");
    return;
  }

  if (tipoSelecionado.value === "toco" && !instrumento) {
    alert("Digite o instrumento que você toca.");
    return;
  }

  localStorage.setItem("nome", nome);
  localStorage.setItem("ministerio", ministerioSelecionado.value);
  localStorage.setItem("tipo", tipoSelecionado.value);
  localStorage.setItem("instrumento", instrumento || "");

  window.location.href = "disponibilidade.html";
}

//////////////////////////////////////////////////////
// CARREGAR DISPONIBILIDADES
//////////////////////////////////////////////////////

async function carregarDisponibilidades() {

  const { data, error } = await supabase
    .from("compromissos")
    .select("*")
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  const lista = document.getElementById("lista-disponibilidade");
  if (!lista) return;

  lista.innerHTML = "";

  let grupos = {};

  data.forEach(item => {
    if (!grupos[item.nome]) grupos[item.nome] = [];
    grupos[item.nome].push(item.turno);
  });

  Object.keys(grupos).forEach(nome => {

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    const container = document.createElement("div");
    container.className = "botoes";

    grupos[nome].forEach(turno => {

      const btn = document.createElement("button");
      btn.innerText = turno;
      btn.className = "btn-disponibilidade";

      btn.dataset.valor = `${nome} | ${turno}`;

      btn.onclick = () => btn.classList.toggle("ativo");

      container.appendChild(btn);
    });

    divGrupo.appendChild(titulo);
    divGrupo.appendChild(container);
    lista.appendChild(divGrupo);
  });
}

async function enviarDisponibilidade(){

  const nome = localStorage.getItem("nome");
  const ministerio = localStorage.getItem("ministerio");

  if (!nome || !ministerio) {
    alert("Volte e preencha seus dados.");
    return;
  }

  const selecionados = document.querySelectorAll(".btn-disponibilidade.ativo");

  if (selecionados.length === 0) {
    alert("Selecione pelo menos uma opção.");
    return;
  }

  const botao = document.querySelector("button[onclick='enviarDisponibilidade()']");
  botao.disabled = true;
  botao.innerText = "Enviando...";

  // 🔥 verifica envio anterior
  const { data: existente, error: erroBusca } = await supabase
    .from("disponibilidades")
    .select("*")
    .eq("nome_pessoa", nome)
    .eq("ministerio", ministerio);

  if (erroBusca) {
    console.error(erroBusca);
    alert("Erro ao verificar disponibilidade.");
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }

  // 🔥 confirmação
  if (existente.length > 0) {
    const confirmar = await abrirPopupConfirmacao();

    if (!confirmar) {
      botao.disabled = false;
      botao.innerText = "Enviar";
      return;
    }
  }

 // 🔥 justificativa por data
let justificativas = null;

if (ministerio === "Música Geral") {
  justificativas = await abrirPopupJustificativa(selecionados);

  if (!justificativas) {
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }
} // 👈 ESSA CHAVE FALTAVA
  
  let dados = [];

  selecionados.forEach((btn, index) => {
    const partes = btn.dataset.valor.split("|");

    const tipo = localStorage.getItem("tipo");
    const instrumento = localStorage.getItem("instrumento");

    dados.push({
      nome_pessoa: nome,
      ministerio: ministerio,
      evento: partes[0].trim(),
      turno: partes[1].trim(),
      tipo: tipo,
      instrumento: instrumento,
      justificativa: justificativas ? justificativas[index] : null
    });
  });

  // 🔥 remove antigo
  const { error: deleteError } = await supabase
    .from("disponibilidades")
    .delete()
    .eq("nome_pessoa", nome)
    .eq("ministerio", ministerio);

  if (deleteError) {
    console.error(deleteError);
    alert("Erro ao atualizar disponibilidade.");
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }

  // 🔥 insere novo
  const { error } = await supabase
    .from("disponibilidades")
    .insert(dados);

  if (error) {
    console.error(error);
    alert("Erro ao enviar.");
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }

  mostrarPopup();
}

//////////////////////////////////////////////////////
// COMPROMISSOS
//////////////////////////////////////////////////////

async function carregarCompromissos() {

  const { data, error } = await supabase
    .from("compromissos")
    .select("*")
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  const lista = document.getElementById("lista-compromissos");
  if (!lista) return;

  lista.innerHTML = "";

  let grupos = {};

  data.forEach(item => {
    if (!grupos[item.nome]) grupos[item.nome] = [];
    grupos[item.nome].push(item);
  });

  Object.keys(grupos).forEach(nome => {

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo";

    const tituloLinha = document.createElement("div");
    tituloLinha.className = "linha-grupo-titulo";

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    tituloLinha.appendChild(titulo);
    divGrupo.appendChild(tituloLinha);

    const container = document.createElement("div");
    container.className = "lista-itens";

    grupos[nome].forEach(item => {

      const div = document.createElement("div");
      div.className = "item-compromisso";

      div.innerHTML = `
        <label class="linha-compromisso">
          <input type="checkbox" value="${item.id}">
          <span class="texto-turno" id="texto-${item.id}">${item.turno}</span>
        </label>
        <div class="acoes-item">
          <button class="btn-editar-item" onclick="editarCompromisso('${item.id}', '${item.turno.replace(/'/g, "\\'")}')">✏️ Editar</button>
          <button class="btn-excluir-item" onclick="excluirCompromissoUnico('${item.id}')">🗑️ Excluir</button>
        </div>
      `;

      container.appendChild(div);
    });

    divGrupo.appendChild(container);
    lista.appendChild(divGrupo);
  });
}

//////////////////////////////////////////////////////
// EDITAR COMPROMISSO INDIVIDUAL
//////////////////////////////////////////////////////

async function editarCompromisso(id, textoAtual) {
  const novoTexto = prompt("Editar compromisso:", textoAtual);
  if (!novoTexto || novoTexto.trim() === textoAtual.trim()) return;

  const { error } = await supabase
    .from("compromissos")
    .update({ turno: novoTexto.trim() })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao editar.");
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// EXCLUIR COMPROMISSO INDIVIDUAL
//////////////////////////////////////////////////////

async function excluirCompromissoUnico(id) {
  const confirmar = confirm("Excluir este compromisso?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("compromissos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao excluir.");
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// EXCLUIR SELECIONADOS
//////////////////////////////////////////////////////

async function excluirSelecionados() {
  const checkboxes = document.querySelectorAll("#lista-compromissos input[type='checkbox']:checked");

  if (checkboxes.length === 0) {
    alert("Selecione pelo menos um compromisso.");
    return;
  }

  const confirmar = confirm(`Excluir ${checkboxes.length} compromisso(s) selecionado(s)?`);
  if (!confirmar) return;

  const ids = Array.from(checkboxes).map(cb => cb.value);

  const { error } = await supabase
    .from("compromissos")
    .delete()
    .in("id", ids);

  if (error) {
    console.error(error);
    alert("Erro ao excluir selecionados.");
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// LIMPAR TUDO
//////////////////////////////////////////////////////

async function limparTudo() {
  const confirmar = confirm("Tem certeza que deseja apagar TODOS os compromissos? Essa ação não pode ser desfeita.");
  if (!confirmar) return;

  const { error } = await supabase
    .from("compromissos")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error(error);
    alert("Erro ao limpar compromissos.");
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// CADASTRAR COMPROMISSOS
//////////////////////////////////////////////////////

async function cadastrarTudo() {

  const texto = document.getElementById("entrada").value;

  if (!texto.trim()) {
    alert("Digite os compromissos.");
    return;
  }

  const linhas = texto.split("\n").filter(l => l.trim() !== "");

  let grupoAtual = "OUTROS COMPROMISSOS";
  let dados = [];

  linhas.forEach(linha => {

    if (linha.startsWith("#")) {
      grupoAtual = linha.replace("#", "").trim().toUpperCase();
    } else {
      dados.push({
        nome: grupoAtual,
        turno: linha
      });
    }

  });

  const { error } = await supabase
    .from("compromissos")
    .insert(dados);

  if (error) {
    console.error(error);
    alert("Erro ao cadastrar.");
    return;
  }

  document.getElementById("entrada").value = "";

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// TOGGLE INSTRUMENTO
//////////////////////////////////////////////////////

function toggleInstrumento() {
  const selecionado = document.querySelector('input[name="tipo"]:checked');
  const campo = document.getElementById("campo-instrumento");

  if (selecionado && selecionado.value === "toco") {
    campo.style.display = "block";
  } else {
    campo.style.display = "none";
  }
}
//////////////////////////////////////////////////////
// LOGOUT
//////////////////////////////////////////////////////

async function fazerLogout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

async function fazerLogin() {

  const email = document.getElementById("email")?.value;
  const senha = document.getElementById("senha")?.value;

  if (!email || !senha) {
    alert("Preencha email e senha.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert("Email ou senha inválidos.");
    return;
  }

  window.location.href = "dashboard.html";
}
//////////////////////////////////////////////////////
// RESPOSTAS (VISUALIZAÇÃO)
//////////////////////////////////////////////////////

let respostasGlobais = [];

async function carregarRespostas() {

  const { data, error } = await supabase
    .from("disponibilidades")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  respostasGlobais = data;

  await popularFiltroEventos();
  renderizarRespostas(data);
}

async function popularFiltroEventos() {

  const select = document.getElementById("filtroEvento");
  if (!select) return;

  const { data, error } = await supabase
    .from("compromissos")
    .select("nome")
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  const eventosUnicos = [...new Set(data.map(item => item.nome))];

  select.innerHTML = `<option value="todos">Todos</option>`;

  eventosUnicos.forEach(evento => {
    const option = document.createElement("option");
    option.value = evento;
    option.textContent = evento;
    select.appendChild(option);
  });
}

function aplicarBusca() {

  const nomeBusca = normalizar(document.getElementById("buscaNome")?.value || "");
  const filtroMinisterio = document.getElementById("filtroMinisterio")?.value;
  const filtroEvento = document.getElementById("filtroEvento")?.value;

  let filtrado = respostasGlobais.filter(pessoa => {

    const nomeOk = normalizar(pessoa.nome_pessoa).includes(nomeBusca);

    const ministerioOk =
      filtroMinisterio === "todos" ||
      pessoa.ministerio === filtroMinisterio;

    const eventoOk =
      filtroEvento === "todos" ||
      pessoa.evento === filtroEvento;

    return nomeOk && ministerioOk && eventoOk;
  });

  renderizarRespostas(filtrado);
}

async function renderizarRespostas(respostasFiltradas) {

  const container = document.getElementById("lista-respostas");
  if (!container) return;

  container.innerHTML = "";

  // 🔥 pega compromissos sempre do banco
  const { data: compromissos } = await supabase.from("compromissos").select("*");

  // 🔥 usa os dados filtrados se foram passados, senão busca tudo
  let respostas;
  if (respostasFiltradas !== undefined) {
    respostas = respostasFiltradas;
  } else {
    const { data } = await supabase.from("disponibilidades").select("*");
    respostas = data;
  }

  // 🔥 lista de pessoas únicas
  const pessoas = [...new Set(respostas.map(r => r.nome_pessoa))];

  let agrupado = {};

  // 🔥 pega o filtro de evento atual para limitar os grupos exibidos
  const filtroEvento = document.getElementById("filtroEvento")?.value || "todos";
  const compromissosFiltrados = filtroEvento === "todos"
    ? compromissos
    : compromissos.filter(comp => comp.nome === filtroEvento);

  compromissosFiltrados.forEach(comp => {
    const chave = `${comp.nome}|||${comp.turno}`;
    agrupado[chave] = [];
  });

  pessoas.forEach(pessoa => {

    const dadosPessoa = respostas.filter(r => r.nome_pessoa === pessoa);
    const ministerio = dadosPessoa[0]?.ministerio;

    compromissosFiltrados.forEach(comp => {

      const chave = `${comp.nome}|||${comp.turno}`;

      const marcou = dadosPessoa.find(r =>
        r.evento === comp.nome &&
        r.turno === comp.turno
      );

      if (ministerio === "Música Geral") {
        // 👉 marcou = NÃO pode
        if (!marcou) {
          agrupado[chave].push({
  nome: pessoa,
  ministerio: dadosPessoa[0]?.ministerio,
  tipo: dadosPessoa[0]?.tipo,
  instrumento: dadosPessoa[0]?.instrumento
});
        }
      } else {
        // 👉 marcou = PODE
        if (marcou) {
          agrupado[chave].push({
  nome: pessoa,
  ministerio: dadosPessoa[0]?.ministerio,
  tipo: dadosPessoa[0]?.tipo,
  instrumento: dadosPessoa[0]?.instrumento
});
        }
      }

    });

  });

  // 🔥 renderização
  Object.keys(agrupado).forEach(chave => {

    const [evento, turno] = chave.split("|||");

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo-evento";

    const titulo = document.createElement("h3");
    titulo.innerText = `${evento} - ${turno}`;

    const lista = document.createElement("div");
    lista.className = "lista-pessoas";

    agrupado[chave].forEach(pessoa => {

      const item = document.createElement("div");
item.className = "item-pessoa";

item.innerHTML = `
  <strong>${pessoa.nome}</strong><br>
  <small>${pessoa.ministerio}</small><br>
  <small>${pessoa.tipo || ""} ${pessoa.instrumento ? "- " + pessoa.instrumento : ""}</small>
`;

lista.appendChild(item);
    });

    divGrupo.appendChild(titulo);
    divGrupo.appendChild(lista);
    container.appendChild(divGrupo);
  });
}
function mostrarPopup() {
  document.getElementById("popup-sucesso").style.display = "flex";
}

function fecharPopup() {
  window.location.href = "index.html";
}
//////////////////////////////////////////////////////
// POPUP DE CONFIRMAÇÃO
//////////////////////////////////////////////////////

let resolverConfirmacao;

function abrirPopupConfirmacao() {
  document.getElementById("popup-confirmacao").style.display = "flex";

  return new Promise((resolve) => {
    resolverConfirmacao = resolve;
  });
}

function confirmarAtualizacao() {
  document.getElementById("popup-confirmacao").style.display = "none";
  resolverConfirmacao(true);
}

function cancelarAtualizacao() {
  document.getElementById("popup-confirmacao").style.display = "none";
  resolverConfirmacao(false);
}

//////////////////////////////////////////////////////
// POPUP JUSTIFICATIVA POR DATA
//////////////////////////////////////////////////////

let resolverJustificativa;

function abrirPopupJustificativa(selecionados) {
  const container = document.getElementById("lista-justificativas");
  container.innerHTML = "";

  selecionados.forEach((btn) => {
    const partes = btn.dataset.valor.split("|");

    const wrapper = document.createElement("div");
    wrapper.className = "justificativa-item";

    const label = document.createElement("p");
    label.innerText = `${partes[0]} - ${partes[1]}`;

    const input = document.createElement("textarea");
    input.placeholder = "Digite o motivo...";

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });

  document.getElementById("popup-justificativa").style.display = "flex";

  return new Promise((resolve) => {
    resolverJustificativa = resolve;
  });
}

function confirmarJustificativa() {
  const inputs = document.querySelectorAll("#lista-justificativas textarea");

  let justificativas = [];

  for (let input of inputs) {
    if (!input.value) {
      alert("Preencha todas as justificativas.");
      return;
    }

    justificativas.push(input.value);
  }

  document.getElementById("popup-justificativa").style.display = "none";
  resolverJustificativa(justificativas);
}
function cancelarJustificativa() {
  document.getElementById("popup-justificativa").style.display = "none";
  resolverJustificativa(null);
}