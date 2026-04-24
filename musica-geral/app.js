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

  if (ultima) {
    window.location.href = ultima;
  } else {
    window.location.href = "index.html";
  }
}

function voltarPagina() {
  voltarSistema();
}

//////////////////////////////////////////////////////
// IDENTIFICAÇÃO
//////////////////////////////////////////////////////

function continuar() {
  const nome = document.getElementById("nome").value;
  const ministerioSelecionado = document.querySelector('input[name="ministerio"]:checked');

  if (!nome || !ministerioSelecionado) {
    alert("Preencha seu nome e selecione o ministério.");
    return;
  }

  localStorage.setItem("nome", nome);
  localStorage.setItem("ministerio", ministerioSelecionado.value);

  irPara("disponibilidade.html");
}

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

async function fazerLogin() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert("Login inválido");
  } else {
    irPara("dashboard.html");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll("input");

  inputs.forEach(input => {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        fazerLogin();
      }
    });
  });
});

//////////////////////////////////////////////////////
// COMPROMISSOS
//////////////////////////////////////////////////////

async function cadastrarTudo() {
  const campo = document.getElementById("entrada");
  const texto = campo.value;

  if (!texto.trim()) {
    alert("Digite algum compromisso.");
    return;
  }

  const linhas = texto.split("\n");

  let grupoAtual = null;
  let dados = [];

  linhas.forEach(linha => {
    linha = linha.trim();
    if (!linha) return;

    if (linha.startsWith("#")) {
      grupoAtual = linha.replace("#", "").trim();
    } else if (grupoAtual) {
      dados.push({
        nome: grupoAtual,
        turno: linha
      });
    }
  });

  const { error } = await supabase.from("compromissos").insert(dados);

  if (error) {
    alert("Erro ao salvar");
  } else {
    campo.value = "";
    carregarCompromissos();
  }
}

async function carregarCompromissos() {
  const { data } = await supabase.from("compromissos").select("*");

  const lista = document.getElementById("lista-compromissos");
  if (!lista) return;

  lista.innerHTML = "";

  let grupos = {};

  data.forEach(item => {
    if (!grupos[item.nome]) grupos[item.nome] = [];
    grupos[item.nome].push(item);
  });

  Object.keys(grupos).forEach(nome => {
    const div = document.createElement("div");
    div.innerHTML = `<h3>${nome}</h3>`;

    grupos[nome].forEach(item => {
      const p = document.createElement("p");
      p.innerText = item.turno;
      div.appendChild(p);
    });

    lista.appendChild(div);
  });
}

//////////////////////////////////////////////////////
// DISPONIBILIDADE (SELEÇÃO)
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
    const div = document.createElement("div");

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    div.appendChild(titulo);

    grupos[nome].forEach(turno => {
      const btn = document.createElement("button");
      btn.innerText = turno;

      btn.dataset.valor = `${nome} | ${turno}`;
      btn.dataset.selecionado = "false";

      btn.onclick = () => {
        const ativo = btn.dataset.selecionado === "true";
        btn.dataset.selecionado = !ativo;
        btn.classList.toggle("selecionado");
      };

      div.appendChild(btn);
    });

    lista.appendChild(div);
  });
}

//////////////////////////////////////////////////////
// ENVIAR DISPONIBILIDADE
//////////////////////////////////////////////////////

async function enviarDisponibilidade() {
  const itens = document.querySelectorAll("button");

  let selecionados = [];

  itens.forEach(item => {
    if (item.dataset.selecionado === "true") {
      selecionados.push(item.dataset.valor);
    }
  });

  if (selecionados.length === 0) {
    alert("Selecione pelo menos um.");
    return;
  }

  const nome = localStorage.getItem("nome");
  const ministerio = localStorage.getItem("ministerio");

  let dados = [];

  selecionados.forEach(valor => {
    const [evento, turno] = valor.split(" | ");

    dados.push({
      nome_pessoa: nome,
      ministerio: ministerio,
      evento,
      turno
    });
  });

  await supabase.from("disponibilidades").insert(dados);

  alert("Enviado!");
  irPara("identificacao.html");
}

//////////////////////////////////////////////////////
// FILTROS
//////////////////////////////////////////////////////

let filtroAtual = "todos";
let filtroEvento = "todos";
let filtroPessoa = "";

function filtrarMinisterio(v) {
  filtroAtual = v;
  carregarRespostas();
}

function filtrarEvento(v) {
  filtroEvento = v;
  carregarRespostas();
}

function filtrarPessoa(v) {
  filtroPessoa = v.toLowerCase();
  carregarRespostas();
}

//////////////////////////////////////////////////////
// CARREGAR RESPOSTAS (PAINEL)
//////////////////////////////////////////////////////

async function carregarRespostas() {
  const { data } = await supabase.from("disponibilidades").select("*");

  const lista = document.getElementById("lista-respostas");
  if (!lista) return;

  lista.innerHTML = "";

  let eventos = {};
  let eventosUnicos = new Set();

  data.forEach(item => {

    if (filtroAtual !== "todos" && item.ministerio !== filtroAtual) return;
    if (filtroEvento !== "todos" && item.evento !== filtroEvento) return;
    if (filtroPessoa && !item.nome_pessoa.toLowerCase().includes(filtroPessoa)) return;

    const chave = `${item.evento} - ${item.turno}`;
    eventosUnicos.add(item.evento);

    if (!eventos[chave]) eventos[chave] = [];
    eventos[chave].push(item);
  });

  const selectEvento = document.querySelector("select[onchange='filtrarEvento(this.value)']");
  if (selectEvento) {
    selectEvento.innerHTML = `<option value="todos">Todos</option>`;

    eventosUnicos.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev;
      opt.textContent = ev;
      selectEvento.appendChild(opt);
    });
  }

  Object.keys(eventos).forEach(evento => {
    const div = document.createElement("div");
    div.innerHTML = `<h3>${evento}</h3>`;

    eventos[evento].forEach(pessoa => {
      let info = "";

      if (pessoa.editado_por) {
        const data = new Date(pessoa.editado_em).toLocaleString("pt-BR");
        info = `<small>Editado por ${pessoa.editado_por} em ${data}</small>`;
      }

      const item = document.createElement("div");
      item.innerHTML = `
        ${pessoa.nome_pessoa} (${pessoa.ministerio})
        ${info}
        <button onclick="editarDisponibilidade('${pessoa.id}')">✏️</button>
      `;

      div.appendChild(item);
    });

    lista.appendChild(div);
  });
}

//////////////////////////////////////////////////////
// EDITAR DISPONIBILIDADE
//////////////////////////////////////////////////////

async function editarDisponibilidade(id) {
  const novoTurno = prompt("Novo turno:");
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