const LOCATIONIQ_TOKEN = 'pk.1a31ca6507dd252aa191052a40573422';
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvhHL4BiAecxAgumFmeFqmNhL62C87PSJ0zX1nIZTkB2tIDEz26y6SFbovQnh3B2oEHQ/exec"; 
const TAXA_MINIMA = 5.00;
const VALOR_POR_KM = 2.00;
const ORIGEM_FIXA = L.latLng(-23.64464679519379, -46.72038817129933);
const WHATSAPP_NUMERO = "5511981071822";

let tipoResidencia = ""; // Inicia vazio
let tipoBusca = ""; // Inicia vazio
let rotaCalculada = false;
let bairroGlobal = "";
let tempoGlobal = "";

// Inicialização do Mapa (Imagem visual do OpenStreetMap para evitar o erro cinza)
const map = L.map('map', { zoomControl: false }).setView(ORIGEM_FIXA, 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Ajuste do texto do marcador de Origem
L.marker(ORIGEM_FIXA).addTo(map).bindPopup("<b>Origem:</b><br>Av. João Dias, 2074").openPopup();

// Roteamento (Traça a linha azul no mapa)
let control = L.Routing.control({
    waypoints: [ORIGEM_FIXA],
    lineOptions: { styles: [{ color: '#3b82f6', weight: 5, opacity: 0.9 }] }, // Linha azul corporativa
    createMarker: (i, wp, n) => (i === n - 1) ? L.marker(wp.latLng).bindPopup("Destino do Cliente") : null, 
    addWaypoints: false,
    routeWhileDragging: false,
    show: false
}).addTo(map);

// ==========================================
// LÓGICA DE EXIBIÇÃO PROGRESSIVA
// ==========================================
document.getElementById('data_entrega').addEventListener('change', checarPasso1);
document.getElementById('hora_entrega').addEventListener('change', checarPasso1);
document.getElementById('nome_cliente').addEventListener('input', checarPasso1);

function checarPasso1() {
    const data = document.getElementById('data_entrega').value;
    const hora = document.getElementById('hora_entrega').value;
    const nome = document.getElementById('nome_cliente').value;
    
    if (data && hora && nome.length > 2) {
        document.getElementById('sec-passo2').style.display = 'block';
    }
}

function selecionarBusca(tipo) {
    tipoBusca = tipo;
    
    // Atualiza visual dos botões
    document.getElementById('btn-por-cep').className = tipo === 'cep' ? 'btn-selecao active' : 'btn-selecao';
    document.getElementById('btn-por-rua').className = tipo === 'rua' ? 'btn-selecao active' : 'btn-selecao';
    
    // Mostra os campos correspondentes
    document.getElementById('sec-passo3').style.display = 'block';
    document.getElementById('campo-cep').style.display = tipo === 'cep' ? 'block' : 'none';
    document.getElementById('campo-rua').style.display = tipo === 'rua' ? 'block' : 'none';
    
    liberarCalculo(); // Recheca se pode liberar o botão de calcular
}

function liberarCalculo() {
    let liberado = false;
    if (tipoBusca === 'cep') {
        const rua = document.getElementById('rua_pelo_cep').value;
        const num = document.getElementById('num_residencia_cep').value;
        if (rua && num) liberado = true;
    } else if (tipoBusca === 'rua') {
        const rua = document.getElementById('destino').value;
        const num = document.getElementById('num_residencia').value;
        if (rua.length > 3 && num) liberado = true;
    }

    if (liberado) {
        document.getElementById('sec-passo4').style.display = 'block';
    }
}

function selecionarTipo(tipo) {
    tipoResidencia = tipo;
    document.getElementById('btn-casa').className = tipo === 'casa' ? 'btn-selecao active' : 'btn-selecao';
    document.getElementById('btn-apto').className = tipo === 'apto' ? 'btn-selecao active' : 'btn-selecao';
    
    const dadosApto = document.getElementById('dados-apto');
    if(tipo === 'apto') {
        dadosApto.style.display = 'grid';
    } else {
        dadosApto.style.display = 'none';
        document.getElementById('bloco').value = '';
        document.getElementById('apto').value = '';
    }
}

// ==========================================
// BUSCA DE ENDEREÇO E ROTA
// ==========================================
async function buscarCep() {
    const cep = document.getElementById('cep').value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
        const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await resp.json();
        if (!data.erro) {
            document.getElementById('rua_pelo_cep').value = data.logradouro;
            bairroGlobal = data.bairro; 
            liberarCalculo(); // Chama aqui para liberar o botão caso o nº já esteja preenchido
        } else { alert("CEP não encontrado."); }
    } catch (e) { console.error("Erro CEP", e); }
}

function validarExpediente() {
    const dataVal = document.getElementById('data_entrega').value;
    const horaVal = document.getElementById('hora_entrega').value;
    
    const d = new Date(dataVal + 'T' + horaVal);
    if(d.getDay() >= 1 && d.getDay() <= 5 && d.getHours() >= 8 && d.getHours() < 17) {
        document.getElementById('modalExpediente').style.display = 'flex';
    } else { 
        buscarRota(); 
    }
}

function continuarCalculo() {
    document.getElementById('modalExpediente').style.display = 'none';
    buscarRota();
}

async function buscarRota() {
    const btn = document.getElementById('btn-calcular');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "⏳ CALCULANDO ROTA...";
    btn.style.opacity = "0.7";

    let queryBusca = "";
    if (tipoBusca === 'cep') {
        queryBusca = `${document.getElementById('rua_pelo_cep').value}, ${document.getElementById('num_residencia_cep').value}, São Paulo, Brasil`;
    } else {
        queryBusca = `${document.getElementById('destino').value}, ${document.getElementById('num_residencia').value}, São Paulo, Brasil`;
    }
    
    try {
        const resp = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(queryBusca)}&format=json`);
        const data = await resp.json();
        
        if(data && data.length > 0) {
            const info = data[0];
            
            if (tipoBusca === 'rua') {
                const partes = info.display_name.split(',');
                bairroGlobal = partes[1] ? partes[1].trim() : "São Paulo";
            }
            
            document.getElementById('res-bairro').innerText = bairroGlobal.toUpperCase();
            
            // Força o mapa a desenhar a rota para o destino
            control.setWaypoints([ORIGEM_FIXA, L.latLng(info.lat, info.lon)]);
        } else { 
            alert("Endereço não localizado no mapa. Verifique se a rua está correta."); 
            btn.innerHTML = textoOriginal;
            btn.style.opacity = "1";
        }
    } catch (e) { 
        alert("Erro ao localizar endereço. Tente novamente."); 
        btn.innerHTML = textoOriginal;
        btn.style.opacity = "1";
    } 
}

control.on('routesfound', function(e) {
    const routes = e.routes[0];
    const km = routes.summary.totalDistance / 1000;
    
    const tempoMin = Math.round(routes.summary.totalTime / 60) + 5;
    tempoGlobal = tempoMin + " MIN";
    
    const calculoBase = km * VALOR_POR_KM;
    const valorFinal = Math.max(TAXA_MINIMA, calculoBase);
    
    document.getElementById('distancia').innerText = km.toFixed(2);
    document.getElementById('res-tempo').innerText = tempoGlobal;
    document.getElementById('valor').innerText = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    document.getElementById('aviso-taxa').style.display = (calculoBase < TAXA_MINIMA ? 'block' : 'none');
    
    // Revela a última seção (Resumo, Local e Envio)
    document.getElementById('sec-passo5').style.display = 'block';
    
    // Restaura o botão
    const btn = document.getElementById('btn-calcular');
    btn.innerHTML = "🔄 RECALCULAR FRETE";
    btn.style.opacity = "1";

    rotaCalculada = true;
    
    // Ajusta a câmera do mapa para ver a origem, a linha azul e o destino juntos
    map.fitBounds(routes.bounds, {padding: [50, 50]});
});

// ==========================================
// ENVIO PARA WHATSAPP E PLANILHA
// ==========================================
function limpar() { location.reload(); }
function fecharModalExpediente() { document.getElementById('modalExpediente').style.display = 'none'; }
function fecharModal() { document.getElementById('avisoLucas').style.display = 'none'; }

function prepararEnvio() {
    if (!tipoResidencia) return alert("Por favor, selecione se a entrega é em CASA ou APTO.");
    document.getElementById('avisoLucas').style.display = 'flex';
}

function obterDataFormatada(dataInput) {
    if(!dataInput) return "---";
    const partes = dataInput.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
}

function finalizarEnvio() {
    const bloco = document.getElementById('bloco').value;
    const apto = document.getElementById('apto').value;
    
    let destFinal = tipoBusca === 'cep' ? 
        `${document.getElementById('rua_pelo_cep').value}, ${document.getElementById('num_residencia_cep').value} (CEP: ${document.getElementById('cep').value})` :
        `${document.getElementById('destino').value}, ${document.getElementById('num_residencia').value}`;

    const dados = {
        data: obterDataFormatada(document.getElementById('data_entrega').value),
        hora: document.getElementById('hora_entrega').value,
        nome: document.getElementById('nome_cliente').value,
        destino: destFinal,
        bairro: bairroGlobal.toUpperCase(),
        ref: document.getElementById('ponto_referencia').value || "NÃO INFORMADO",
        km: document.getElementById('distancia').innerText,
        valor: document.getElementById('valor').innerText,
        tipo: tipoResidencia.toUpperCase(),
        bloco: bloco || "---",
        apto: apto || "---"
    };

    let msg = `*NOVO PEDIDO - ALENCAR FRETES*%0A%0A`;
    msg += `📅 *DATA:* ${dados.data}%0A⏰ *HORA:* ${dados.hora}%0A👤 *CLIENTE:* ${dados.nome}%0A🏘️ *BAIRRO:* ${dados.bairro}%0A⏱️ *TEMPO ESTIMADO:* ${tempoGlobal}%0A🏁 *DESTINO:* ${dados.destino}%0A`;
    
    if(tipoResidencia === 'apto') {
        msg += `🏢 *LOCAL:* Bloco ${dados.bloco} - Apto ${dados.apto}%0A`;
    }
    
    msg += `📍 *REF:* ${dados.ref}%0A📏 *DISTÂNCIA:* ${dados.km} km%0A💰 *VALOR:* ${dados.valor}`;

    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dados) });
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`, '_blank');
    fecharModal();
}
