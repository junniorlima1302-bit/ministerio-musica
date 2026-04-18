//////////////////////////////////////////////////////
// NAVEGAÇÃO
//////////////////////////////////////////////////////

function irPara(pagina) {
  window.location.href = pagina;
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

  window.location.href = "disponibilidade.html";
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
    window.location.href = "dashboard.html";
  }
}

//////////////////////////////////////////////////////
// CADASTRAR COMPROMISSOS
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

  if (dados.length === 0) return;

  const { error } = await supabase
    .from("compromissos")
    .insert(dados);

  if (error) {
    alert("Erro ao salvar");
  } else {
    campo.value = "";
    carregarCompromissos();
  }
}

//////////////////////////////////////////////////////
// CARREGAR COMPROMISSOS
//////////////////////////////////////////////////////

async function carregarCompromissos() {

  const { data, error } = await supabase
    .from("compromissos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const lista = document.getElementById("lista-compromissos");
  lista.innerHTML = "";

  let grupos = {};

  data.forEach(item => {
    if (!grupos[item.nome]) grupos[item.nome] = [];
    grupos[item.nome].push(item);
  });

  Object.keys(grupos).forEach(nome => {

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo";

    const header = document.createElement("div");
    header.className = "grupo-header";

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    const btnAdd = document.createElement("span");
    btnAdd.innerText = "+";
    btnAdd.className = "btn-add-mini";

    btnAdd.onclick = async () => {
      const novo = prompt("Novo item:");
      if (!novo) return;

      await supabase
        .from("compromissos")
        .insert({
          nome: nome,
          turno: novo
        });

      carregarCompromissos();
    };

    header.appendChild(titulo);
    header.appendChild(btnAdd);

    divGrupo.appendChild(header);

    const itensOrdenados = grupos[nome].sort((a, b) =>
      a.turno.localeCompare(b.turno, undefined, { numeric: true })
    );

    itensOrdenados.forEach(item => {

      const linha = document.createElement("div");
      linha.className = "item-linha";

      const esquerda = document.createElement("div");
      esquerda.className = "item-esquerda";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.id = item.id;

      const texto = document.createElement("span");
      texto.innerText = item.turno;

      esquerda.appendChild(checkbox);
      esquerda.appendChild(texto);

      const acoes = document.createElement("div");
      acoes.className = "item-acoes";

      const btnEditar = document.createElement("button");
      btnEditar.innerText = "✏️";

      btnEditar.onclick = async () => {
        const novo = prompt("Editar:", item.turno);
        if (!novo) return;

        await supabase
          .from("compromissos")
          .update({ turno: novo })
          .eq("id", item.id);

        carregarCompromissos();
      };

      const btnExcluir = document.createElement("button");
      btnExcluir.innerText = "🗑️";

      btnExcluir.onclick = async () => {
        await supabase
          .from("compromissos")
          .delete()
          .eq("id", item.id);

        carregarCompromissos();
      };

      acoes.appendChild(btnEditar);
      acoes.appendChild(btnExcluir);

      linha.appendChild(esquerda);
      linha.appendChild(acoes);

      divGrupo.appendChild(linha);
    });

    lista.appendChild(divGrupo);
  });
}

//////////////////////////////////////////////////////
// EXCLUIR SELECIONADOS
//////////////////////////////////////////////////////

async function excluirSelecionados() {
  const checks = document.querySelectorAll("input[type='checkbox']:checked");

  for (let check of checks) {
    await supabase
      .from("compromissos")
      .delete()
      .eq("id", check.dataset.id);
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// LIMPAR TUDO
//////////////////////////////////////////////////////

async function limparTudo() {
  if (!confirm("Deseja apagar tudo?")) return;

  await supabase
    .from("compromissos")
    .delete()
    .neq("id", 0);

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// DISPONIBILIDADE
//////////////////////////////////////////////////////

async function carregarDisponibilidades() {

  const { data } = await supabase
    .from("compromissos")
    .select("*");

  const lista = document.getElementById("lista-disponibilidade");
  lista.innerHTML = "";

  let grupos = {};

  data.forEach(item => {
    if (!grupos[item.nome]) grupos[item.nome] = [];
    grupos[item.nome].push(item.turno);
  });

  Object.keys(grupos).forEach(nome => {

    const grupoDiv = document.createElement("div");
    grupoDiv.className = "grupo-disponibilidade";

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    const grid = document.createElement("div");
    grid.className = "grupo-itens";

    grupos[nome].forEach(turno => {

      const botao = document.createElement("div");
      botao.className = "item-btn";
      botao.innerText = turno;

      botao.dataset.valor = `${nome} | ${turno}`;
      botao.dataset.selecionado = "false";

      botao.onclick = () => {
        const ativo = botao.dataset.selecionado === "true";
        botao.dataset.selecionado = !ativo;
        botao.classList.toggle("selecionado");
      };

      grid.appendChild(botao);
    });

    grupoDiv.appendChild(titulo);
    grupoDiv.appendChild(grid);

    lista.appendChild(grupoDiv);
  });
}

//////////////////////////////////////////////////////
// ENVIAR DISPONIBILIDADE (ATUALIZADO)
//////////////////////////////////////////////////////

async function enviarDisponibilidade() {
  const itens = document.querySelectorAll(".item-btn");

  let selecionados = [];

  itens.forEach(item => {
    if (item.dataset.selecionado === "true") {
      selecionados.push(item.dataset.valor);
    }
  });

  if (selecionados.length === 0) {
    alert("Selecione pelo menos um compromisso.");
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
      evento: evento,
      turno: turno
    });
  });

  const { error } = await supabase
    .from("disponibilidades")
    .insert(dados);

  if (error) {
    alert(error.message);
  } else {
    alert("Disponibilidade enviada!");

    // 🔥 limpa identificação
    localStorage.removeItem("nome");
    localStorage.removeItem("ministerio");

    // 🔥 redireciona
    window.location.href = "identificacao.html";
  }
}

//////////////////////////////////////////////////////
// FILTRO
//////////////////////////////////////////////////////

let filtroAtual = "todos";

function filtrarMinisterio(ministerio) {
  filtroAtual = ministerio;
  carregarRespostas();
}

//////////////////////////////////////////////////////
// VER RESPOSTAS
//////////////////////////////////////////////////////

async function carregarRespostas() {

  const { data, error } = await supabase
    .from("disponibilidades")
    .select("*");

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  const lista = document.getElementById("lista-respostas");
  lista.innerHTML = "";

  let eventos = {};

  data.forEach(item => {

    if (
      filtroAtual !== "todos" &&
      item.ministerio &&
      item.ministerio.toLowerCase().trim() !== filtroAtual.toLowerCase().trim()
    ) {
      return;
    }

    const chave = `${item.evento} - ${item.turno}`;

    if (!eventos[chave]) {
      eventos[chave] = [];
    }

    eventos[chave].push({
      nome: item.nome_pessoa,
      ministerio: item.ministerio
    });

  });

  Object.keys(eventos).forEach(evento => {

    const div = document.createElement("div");
    div.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.innerText = evento;

    div.appendChild(titulo);

    const containerNomes = document.createElement("div");
    containerNomes.className = "nomes-container";

    eventos[evento].forEach(pessoa => {

      const tag = document.createElement("div");
      tag.className = "nome-tag";

      tag.innerText = `${pessoa.nome} (${pessoa.ministerio})`;

      containerNomes.appendChild(tag);
    });

    div.appendChild(containerNomes);

    lista.appendChild(div);
  });
}function voltarPagina() {
  window.history.back();
}