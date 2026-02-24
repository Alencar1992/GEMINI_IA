const LOCATIONIQ_TOKEN = 'pk.1a31ca6507dd252aa191052a40573422';
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvhHL4BiAecxAgumFmeFqmNhL62C87PSJ0zX1nIZTkB2tIDEz26y6SFbovQnh3B2oEHQ/exec"; 
const TAXA_MINIMA = 5.00;
const VALOR_POR_KM = 2.00;
const ORIGEM_FIXA = L.latLng(-23.64464679519379, -46.72038817129933);
const WHATSAPP_NUMERO = "5511981071822";

let tipoResidencia = "casa"; 
let tipoBusca = "cep"; 
let rotaCalculada = false;
let bairroGlobal = "";
let tempoGlobal = "";

// ==========================================
// INICIALIZAÇÃO DO MAPA (Ícones de Moto e Casa)
// ==========================================
const map = L.map('map', { zoomControl: false }).setView(ORIGEM_FIXA, 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Criação dos ícones personalizados com Emojis
const iconeMoto = L.divIcon({ html: '🏍️', className: 'icone-mapa-moto', iconSize: [30, 30], iconAnchor: [15, 15] });
const iconeCasa = L.divIcon({ html: '🏠', className: 'icone-mapa-casa', iconSize: [30, 30], iconAnchor: [15, 15] });

let control = L.Routing.control({
    waypoints: [ORIGEM_FIXA],
    lineOptions: { styles: [{ color: '#00d4ff', weight: 6, opacity: 0.9 }] }, // Linha azul neon
    createMarker: function(i, wp, n) {
        if (i === 0) {
            return L.marker(wp.latLng, { icon: iconeMoto }).bindPopup("<b>Origem:</b><br>Alencar Fretes");
        } else if (i === n - 1) {
            return L.marker(wp.latLng, { icon: iconeCasa }).bindPopup("<b>Destino:</b><br>Cliente");
        }
        return null;
    },
    addWaypoints: false,
    routeWhileDragging: false,
    show: false
}).addTo(map);


// ==========================================
// FUNÇÕES DOS BOTÕES (Sem telas escondidas chatas)
// ==========================================
function selecionarTipo(tipo) {
    tipoResidencia = tipo;
    document.getElementById('btn-casa').className = tipo === 'casa' ? 'btn-selecao active' : 'btn-selecao';
    document.getElementById('btn-apto').className = tipo === 'apto' ? 'btn-selecao active' : 'btn-selecao';
    document.getElementById('dados-apto').style.display = tipo === 'apto' ? 'block' : 'none';
}

function selecionarBusca(tipo) {
    tipoBusca = tipo;
    document.getElementById('btn-por-cep').className = tipo === 'cep' ? 'btn-selecao active' : 'btn-selecao';
    document.getElementById('btn-por-rua').className = tipo === 'rua' ? 'btn-selecao active' : 'btn-selecao';
    document.getElementById('campo-cep').style.display = tipo === 'cep' ? 'block' : 'none';
    document.getElementById('campo-rua').style.display = tipo === 'rua' ? 'block' : 'none';
}

async function buscarCep() {
    const cep = document.getElementById('cep').value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
        const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await resp.json();
        if (!data.erro) {
            document.getElementById('rua_pelo_cep').value = data.logradouro;
            bairroGlobal = data.bairro; 
        } else { alert("CEP não encontrado."); }
    } catch (e) { console.error("Erro CEP"); }
}

function validarExpediente() {
    const dataVal = document.getElementById('data_entrega').value;
    const horaVal = document.getElementById('hora_entrega').value;
    
    if(!dataVal || !horaVal) return alert("Por favor, preencha a Data e o Horário da entrega!");
    
    if (tipoBusca === 'cep' && (!document.getElementById('cep').value || !document.getElementById('num_residencia_cep').value)) {
        return alert("Preencha o CEP e o Número da residência!");
    } else if (tipoBusca === 'rua' && (!document.getElementById('destino').value || !document.getElementById('num_residencia').value)) {
        return alert("Preencha a Rua e o Número da residência!");
    }

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

    // O Segredo: Amarrar com "São Paulo - SP" forçado para o LocationIQ não errar.
    let queryBusca = "";
    if (tipoBusca === 'cep') {
        queryBusca = `${document.getElementById('rua_pelo_cep').value}, ${document.getElementById('num_residencia_cep').value}, São Paulo - SP, Brasil`;
    } else {
        queryBusca = `${document.getElementById('destino').value}, ${document.getElementById('num_residencia').value}, São Paulo - SP, Brasil`;
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
            
            // Traça a rota. O mapa será mostrado no evento 'routesfound'
            control.setWaypoints([ORIGEM_FIXA, L.latLng(info.lat, info.lon)]);
        } else { 
            alert("Endereço não localizado. Verifique se digitou a rua corretamente."); 
            btn.innerHTML = textoOriginal; btn.style.opacity = "1";
        }
    } catch (e) { 
        alert("Erro de conexão ao buscar rota."); 
        btn.innerHTML = textoOriginal; btn.style.opacity = "1";
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
    
    // Revela a seção de Resumo e Botão do WhatsApp
    document.getElementById('campo-resumo').style.display = 'block';
    document.getElementById('sec-tipo-local').style.display = 'block';
    
    // Como o mapa estava com display:none, o Leaflet precisa desse comando para se redesenhar no tamanho certo
    setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(routes.bounds, {padding: [30, 30]});
    }, 200);
    
    const btn = document.getElementById('btn-calcular');
    btn.innerHTML = "🔄 RECALCULAR FRETE";
    btn.style.opacity = "1";

    rotaCalculada = true;
});

// ==========================================
// MÉTODOS DE ENVIO
// ==========================================
function limpar() { location.reload(); }
function fecharModalExpediente() { document.getElementById('modalExpediente').style.display = 'none'; }
function fecharModal() { document.getElementById('avisoLucas').style.display = 'none'; }

function prepararEnvio() {
    if (!document.getElementById('nome_cliente').value) return alert("Por favor, preencha o Nome do Cliente no início do formulário!");
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
