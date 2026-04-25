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

  if (!nome || !ministerioSelecionado) {
    alert("Preencha seu nome e selecione o ministério.");
    return;
  }

  localStorage.setItem("nome", nome);
  localStorage.setItem("ministerio", ministerioSelecionado.value);

  window.location.href = "disponibilidade.html";
}

//////////////////////////////////////////////////////
// FILTROS
//////////////////////////////////////////////////////

let filtroAtual = "todos";
let filtroEvento = "todos";
let filtroPessoa = "";

document.addEventListener("DOMContentLoaded", () => {

  const selectMin = document.getElementById("filtroMinisterio");
  const selectEv = document.getElementById("filtroEvento");
  const inputBusca = document.getElementById("buscaNome");

  if (selectMin) {
    selectMin.addEventListener("change", () => {
      filtroAtual = normalizar(selectMin.value);
      carregarRespostas();
    });
  }

  if (selectEv) {
    selectEv.addEventListener("change", () => {
      filtroEvento = normalizar(selectEv.value);
      carregarRespostas();
    });
  }

  if (inputBusca) {
    inputBusca.addEventListener("keypress", function (e) {
      if (e.key === "Enter") aplicarBusca();
    });
  }
});

function aplicarBusca() {
  const input = document.getElementById("buscaNome");
  if (!input) return;

  filtroPessoa = normalizar(input.value);
  carregarRespostas();
}

//////////////////////////////////////////////////////
// CARREGAR RESPOSTAS
//////////////////////////////////////////////////////

async function carregarRespostas() {

  const { data, error } = await supabase
    .from("disponibilidades")
    .select("*");

  if (error) return console.error(error);

  const lista = document.getElementById("lista-respostas");
  if (!lista) return;

  lista.innerHTML = "";

  let eventos = {};
  let eventosUnicos = new Set();

  data.forEach(item => {

    if (filtroAtual !== "todos" && normalizar(item.ministerio) !== normalizar(filtroAtual)) return;
    if (filtroEvento !== "todos" && normalizar(item.evento) !== normalizar(filtroEvento)) return;
    if (filtroPessoa && !normalizar(item.nome_pessoa).includes(filtroPessoa)) return;

    const chave = `${item.evento} - ${item.turno}`;
    eventosUnicos.add(item.evento);

    if (!eventos[chave]) eventos[chave] = [];
    eventos[chave].push(item);
  });

  Object.keys(eventos).forEach(evento => {

    const div = document.createElement("div");
    div.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.innerText = evento;

    const container = document.createElement("div");
    container.className = "nomes-container";

    eventos[evento].forEach(pessoa => {

      const tag = document.createElement("div");
      tag.className = "nome-tag";

      tag.innerHTML = `
        <div onclick="editarDisponibilidade('${pessoa.id}')" style="cursor:pointer;">
          ${pessoa.nome_pessoa} (${pessoa.ministerio})
        </div>
      `;

      container.appendChild(tag);
    });

    div.appendChild(titulo);
    div.appendChild(container);
    lista.appendChild(div);
  });
}

//////////////////////////////////////////////////////
// EDITAR DISPONIBILIDADE
//////////////////////////////////////////////////////

async function editarDisponibilidade(id) {

  const novoTurno = prompt("Editar turno:");
  if (!novoTurno) return;

  await supabase
    .from("disponibilidades")
    .update({ turno: novoTurno })
    .eq("id", id);

  carregarRespostas();
}

//////////////////////////////////////////////////////
// CARREGAR DISPONIBILIDADES
//////////////////////////////////////////////////////

async function carregarDisponibilidades() {

  const { data } = await supabase.from("compromissos").select("*");

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

//////////////////////////////////////////////////////
// ENVIAR DISPONIBILIDADE
//////////////////////////////////////////////////////

async function enviarDisponibilidade() {

  const nome = localStorage.getItem("nome");
  const ministerio = localStorage.getItem("ministerio");

  const selecionados = document.querySelectorAll(".btn-disponibilidade.ativo");

  if (selecionados.length === 0) {
    alert("Selecione pelo menos uma.");
    return;
  }

  let dados = [];

  selecionados.forEach(btn => {
    const partes = btn.dataset.valor.split("|");

    dados.push({
      nome_pessoa: nome,
      ministerio: ministerio,
      evento: partes[0].trim(),
      turno: partes[1].trim()
    });
  });

  await supabase.from("disponibilidades").insert(dados);

  window.location.href = "index.html";
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

  window.location.href = "escala.html";
}

//////////////////////////////////////////////////////
// COMPROMISSOS
//////////////////////////////////////////////////////

async function carregarCompromissos() {

  const { data } = await supabase
    .from("compromissos")
    .select("*")
    .order("id");

  const lista = document.getElementById("lista-compromissos");
  if (!lista) return;

  lista.innerHTML = "";

  data.forEach(item => {

    const div = document.createElement("div");
    div.className = "item-compromisso";

    div.innerHTML = `
      <input type="checkbox" value="${item.id}">
      <span>${item.texto || "Sem conteúdo"}</span>
    `;

    lista.appendChild(div);
  });
}

async function cadastrarTudo() {

  const texto = document.getElementById("entrada").value;

  const linhas = texto.split("\n").filter(l => l.trim() !== "");

  const dados = linhas.map(l => ({ texto: l }));

  await supabase.from("compromissos").insert(dados);

  document.getElementById("entrada").value = "";

  carregarCompromissos();
}

async function limparTudo() {

  await supabase.from("compromissos").delete().neq("id", 0);

  carregarCompromissos();
}

async function excluirSelecionados() {

  const selecionados = document.querySelectorAll("#lista-compromissos input:checked");

  const ids = Array.from(selecionados).map(cb => Number(cb.value));

  await supabase.from("compromissos").delete().in("id", ids);

  carregarCompromissos();
}