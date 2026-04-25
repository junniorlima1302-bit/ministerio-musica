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
// CARREGAR DISPONIBILIDADES (USANDO COMPROMISSOS)
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

//////////////////////////////////////////////////////
// ENVIAR DISPONIBILIDADE
//////////////////////////////////////////////////////

async function enviarDisponibilidade() {

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

  const { error } = await supabase
    .from("disponibilidades")
    .insert(dados);

  if (error) {
    console.error(error);
    alert("Erro ao enviar.");
    return;
  }

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

  window.location.href = "dashboard.html";
}

//////////////////////////////////////////////////////
// COMPROMISSOS (100% COMPATÍVEL COM SEU BANCO)
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

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    const container = document.createElement("div");
    container.className = "lista-itens";

    grupos[nome].forEach(item => {

      const div = document.createElement("div");
      div.className = "item-compromisso";

     div.innerHTML = `
  <label class="linha-compromisso">
    <input type="checkbox" value="${item.id}">
    <span>${item.turno}</span>
  </label>
`;

      container.appendChild(div);
    });

    divGrupo.appendChild(titulo);
    divGrupo.appendChild(container);

    lista.appendChild(divGrupo);
  });
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
// EXCLUIR SELECIONADOS
//////////////////////////////////////////////////////

async function excluirSelecionados() {

  const selecionados = document.querySelectorAll("#lista-compromissos input:checked");

  if (selecionados.length === 0) {
    alert("Selecione pelo menos um.");
    return;
  }

  const ids = Array.from(selecionados).map(cb => cb.value);

  const { error } = await supabase
    .from("compromissos")
    .delete()
    .in("id", ids);

  if (error) {
    console.error(error);
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// LIMPAR TUDO
//////////////////////////////////////////////////////

async function limparTudo() {

  if (!confirm("Tem certeza que deseja apagar tudo?")) return;

  await supabase
    .from("compromissos")
    .delete()
    .neq("id", "");

  carregarCompromissos();
}async function carregarRespostas() {

  const { data, error } = await supabase
    .from("disponibilidades")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById("lista-respostas");
  if (!container) return;

  container.innerHTML = "";

  data.forEach(item => {

    const div = document.createElement("div");
    div.className = "item-resposta";

    div.innerHTML = `
      <strong>${item.nome_pessoa}</strong> - ${item.ministerio}<br>
      <span>${item.evento} | ${item.turno}</span>
    `;

    container.appendChild(div);
  });
}//////////////////////////////////////////////////////
// VAR GLOBAL
//////////////////////////////////////////////////////
let respostasGlobais = [];

//////////////////////////////////////////////////////
// CARREGAR DADOS
//////////////////////////////////////////////////////
async function carregarRespostas() {

  const { data, error } = await supabase
    .from("disponibilidades")
    .select("*");

  if (error) {
    console.error("Erro ao buscar:", error);
    return;
  }

  respostasGlobais = data;

  popularFiltroEventos(data);
  renderizarRespostas(data);
}

//////////////////////////////////////////////////////
// RENDERIZAR
//////////////////////////////////////////////////////
function renderizarRespostas(listaDados) {

  const lista = document.getElementById("lista-respostas");
  lista.innerHTML = "";

  const agrupado = {};

  listaDados.forEach(item => {
    const chave = `${item.evento} | ${item.turno}`;

    if (!agrupado[chave]) {
      agrupado[chave] = [];
    }

    agrupado[chave].push(item);
  });

  Object.keys(agrupado).forEach(evento => {

    const grupoDiv = document.createElement("div");
    grupoDiv.className = "grupo-evento";

    const titulo = document.createElement("h3");
    titulo.textContent = evento;

    const listaPessoas = document.createElement("div");
    listaPessoas.className = "lista-pessoas";

    agrupado[evento].forEach(pessoa => {

      const item = document.createElement("div");
      item.className = "item-pessoa";
      item.innerHTML = `
  <strong>${pessoa.nome_pessoa}</strong><br>
  <span>${pessoa.ministerio}</span>
`;

      listaPessoas.appendChild(item);
    });

    grupoDiv.appendChild(titulo);
    grupoDiv.appendChild(listaPessoas);

    lista.appendChild(grupoDiv);
  });
}
//////////////////////////////////////////////////////
// FILTRO EVENTOS
//////////////////////////////////////////////////////
function popularFiltroEventos(dados) {

  const select = document.getElementById("filtroEvento");

  let eventosUnicos = [...new Set(dados.map(d => d.evento))];

  select.innerHTML = `<option value="todos">Todos</option>`;

  eventosUnicos.forEach(evento => {
    select.innerHTML += `<option value="${evento}">${evento}</option>`;
  });
}

//////////////////////////////////////////////////////
// BUSCA + FILTRO
//////////////////////////////////////////////////////
function aplicarBusca() {

  const ministerio = document.getElementById("filtroMinisterio").value;
  const evento = document.getElementById("filtroEvento").value;
  const nomeBusca = document.getElementById("buscaNome").value.toLowerCase();

  let filtrados = respostasGlobais;

  if (ministerio !== "todos") {
    filtrados = filtrados.filter(r => r.ministerio === ministerio);
  }

  if (evento !== "todos") {
    filtrados = filtrados.filter(r => r.evento === evento);
  }

  if (nomeBusca) {
    filtrados = filtrados.filter(r =>
      r.nome_pessoa.toLowerCase().includes(nomeBusca)
    );
  }

  renderizarRespostas(filtrados);
}

//////////////////////////////////////////////////////
// VOLTAR
//////////////////////////////////////////////////////
function voltarPagina() {
  window.history.back();
}function adicionarEvento(grupo) {
  const nome = prompt("Nome do novo evento:");
  if (!nome) return;

  // aqui você salva no Supabase
  console.log("Adicionar no grupo:", grupo, nome);
}

function editarEvento(id) {
  const novoNome = prompt("Editar evento:");
  if (!novoNome) return;

  // aqui você atualiza no Supabase
  console.log("Editar evento:", id, novoNome);
}