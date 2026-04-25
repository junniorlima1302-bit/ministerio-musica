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

  const ministerio = ministerioSelecionado.value;

  localStorage.setItem("nome", nome);
  localStorage.setItem("ministerio", ministerio);

  window.location.href = "disponibilidade.html";
}

//////////////////////////////////////////////////////
// FILTROS
//////////////////////////////////////////////////////

let filtroAtual = "todos";
let filtroEvento = "todos";
let filtroPessoa = "";

//////////////////////////////////////////////////////
// EVENTOS DOM
//////////////////////////////////////////////////////

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
      if (e.key === "Enter") {
        aplicarBusca();
      }
    });
  }

});

//////////////////////////////////////////////////////
// BUSCA
//////////////////////////////////////////////////////

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

  if (error) {
    console.error(error);
    return;
  }

  const lista = document.getElementById("lista-respostas");
  if (!lista) return;

  lista.innerHTML = "";

  let eventos = {};
  let eventosUnicos = new Set();

  data.forEach(item => {

    if (
      filtroAtual !== "todos" &&
      normalizar(item.ministerio) !== normalizar(filtroAtual)
    ) return;

    if (
      filtroEvento !== "todos" &&
      normalizar(item.evento) !== normalizar(filtroEvento)
    ) return;

    if (
      filtroPessoa &&
      !normalizar(item.nome_pessoa).includes(filtroPessoa)
    ) return;

    const chave = `${item.evento} - ${item.turno}`;
    eventosUnicos.add(item.evento);

    if (!eventos[chave]) eventos[chave] = [];
    eventos[chave].push(item);
  });

  const selectEvento = document.getElementById("filtroEvento");

  if (selectEvento && selectEvento.options.length <= 1) {
    eventosUnicos.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev;
      opt.textContent = ev;
      selectEvento.appendChild(opt);
    });
  }

  Object.keys(eventos).forEach(evento => {

    const div = document.createElement("div");
    div.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.innerText = evento;

    div.appendChild(titulo);

    const container = document.createElement("div");
    container.className = "nomes-container";

    eventos[evento].forEach(pessoa => {

      const tag = document.createElement("div");
      tag.className = "nome-tag";

      let info = "";

      if (pessoa.editado_por) {
        const dataFormatada = new Date(pessoa.editado_em).toLocaleString("pt-BR");
        info = `<div class="editado-info">
          Editado por ${pessoa.editado_por} em ${dataFormatada}
        </div>`;
      }

      tag.innerHTML = `
        <div onclick="editarDisponibilidade('${pessoa.id}')" style="cursor:pointer;">
          ${pessoa.nome_pessoa} (${pessoa.ministerio})
        </div>
        ${info}
      `;

      container.appendChild(tag);
    });

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

  const user = (await supabase.auth.getUser()).data.user;

  await supabase
    .from("disponibilidades")
    .update({
      turno: novoTurno,
      editado_por: user?.email || "coordenação",
      editado_em: new Date().toISOString()
    })
    .eq("id", id);

  carregarRespostas();
}

//////////////////////////////////////////////////////
// CARREGAR DISPONIBILIDADES (VISUAL CORRETO)
//////////////////////////////////////////////////////

async function carregarDisponibilidades() {

  const { data, error } = await supabase
    .from("compromissos")
    .select("*");

  if (error) {
    console.error("Erro ao carregar compromissos:", error);
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

    divGrupo.appendChild(titulo);

    const container = document.createElement("div");
    container.className = "botoes";

    grupos[nome].forEach(turno => {

      const btn = document.createElement("button");

      btn.innerText = turno;
      btn.className = "btn-disponibilidade";

      btn.dataset.valor = `${nome} | ${turno}`;

      btn.onclick = () => {
        btn.classList.toggle("ativo");
      };

      container.appendChild(btn);
    });

    divGrupo.appendChild(container);
    lista.appendChild(divGrupo);
  });
}//////////////////////////////////////////////////////
// ENVIAR DISPONIBILIDADE (FUNCIONANDO)
//////////////////////////////////////////////////////

async function enviarDisponibilidade() {

  const nome = localStorage.getItem("nome");
  const ministerio = localStorage.getItem("ministerio");

  if (!nome || !ministerio) {
    alert("Erro: identificação não encontrada.");
    return;
  }

  const selecionados = document.querySelectorAll(".btn-disponibilidade.ativo");

  if (selecionados.length === 0) {
    alert("Selecione pelo menos uma disponibilidade.");
    return;
  }

  let dados = [];

  selecionados.forEach(btn => {
    const valor = btn.dataset.valor;

    // exemplo: "MISSAS DOMINICAIS | DIA 3..."
    const partes = valor.split("|");

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
    alert("Erro ao enviar disponibilidade.");
    return;
  }

  alert("Disponibilidade enviada com sucesso!");

  window.location.href = "index.html";
}//////////////////////////////////////////////////////
// ENVIAR DISPONIBILIDADE
//////////////////////////////////////////////////////

async function enviarDisponibilidade() {

  const nome = localStorage.getItem("nome");
  const ministerio = localStorage.getItem("ministerio");

  if (!nome || !ministerio) {
    alert("Erro: identificação não encontrada.");
    return;
  }

  const selecionados = document.querySelectorAll(".btn-disponibilidade.ativo");

  if (selecionados.length === 0) {
    alert("Selecione pelo menos uma disponibilidade.");
    return;
  }

  let dados = [];

  selecionados.forEach(btn => {
    const valor = btn.dataset.valor;

    const partes = valor.split("|");

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

  alert("Disponibilidade enviada!");

  window.location.href = "index.html";
}//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

async function fazerLogin() {

  const email = document.getElementById("email")?.value;
  const senha = document.getElementById("senha")?.value;

  if (!email || !senha) {
    alert("Preencha email e senha.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    console.error(error);
    alert("Email ou senha inválidos.");
    return;
  }

  alert("Login realizado com sucesso!");

  window.location.href = "respostas.html";
}