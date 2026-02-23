// ==========================================
// CONFIGURAÇÕES PRINCIPAIS - ALENCAR FRETES
// ==========================================
const LOCATIONIQ_TOKEN = 'pk.1a31ca6507dd252aa191052a40573422'; // <<-- COLOQUE SUA CHAVE AQUI
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
// INICIALIZAÇÃO DO MAPA (Tiles LocationIQ)
// ==========================================
const map = L.map('map', { zoomControl: false }).setView(ORIGEM_FIXA, 15);

L.tileLayer(`https://{s}.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_TOKEN}`, {
    attribution: 'LocationIQ'
}).addTo(map);

L.marker(ORIGEM_FIXA).addTo(map).bindPopup("Origem: Fretes").openPopup();

let control = L.Routing.control({
    waypoints: [ORIGEM_FIXA],
    lineOptions: { styles: [{ color: '#00d4ff', weight: 6, opacity: 0.8 }] },
    createMarker: (i, wp, n) => (i === n - 1) ? L.marker(wp.latLng).bindPopup("Destino do Cliente") : null, 
    addWaypoints: false,
    show: false
}).addTo(map);

// ==========================================
// FUNÇÕES DE INTERFACE (Botões e Abas)
// ==========================================
function selecionarTipo(tipo) {
    tipoResidencia = tipo;
    document.getElementById('btn-casa').className = tipo === 'casa' ? 'btn-tipo active' : 'btn-tipo';
    document.getElementById('btn-apto').className = tipo === 'apto' ? 'btn-tipo active' : 'btn-tipo';
    document.getElementById('dados-apto').style.display = tipo === 'apto' ? 'grid' : 'none';
}

function selecionarBusca(tipo) {
    tipoBusca = tipo;
    document.getElementById('btn-por-cep').className = tipo === 'cep' ? 'btn-busca active' : 'btn-busca';
    document.getElementById('btn-por-rua').className = tipo === 'rua' ? 'btn-busca active' : 'btn-busca';
    document.getElementById('campo-cep').style.display = tipo === 'cep' ? 'block' : 'none';
    document.getElementById('campo-rua').style.display = tipo === 'rua' ? 'block' : 'none';
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
            bairroGlobal = data.bairro; // Já guarda o bairro correto do ViaCEP
        } else { alert("CEP não encontrado."); }
    } catch (e) { console.error("Erro CEP", e); }
}

function validarExpediente() {
    const dataVal = document.getElementById('data_entrega').value;
    const horaVal = document.getElementById('hora_entrega').value;
    
    if(!dataVal || !horaVal) return alert("Por favor, preencha a Data e o Horário da entrega!");
    
    // Validação de campos vazios
    if (tipoBusca === 'cep' && (!document.getElementById('cep').value || !document.getElementById('num_residencia_cep').value)) {
        return alert("Preencha o CEP e o Número da residência!");
    } else if (tipoBusca === 'rua' && (!document.getElementById('destino').value || !document.getElementById('num_residencia').value)) {
        return alert("Preencha a Rua e o Número da residência!");
    }

    // Regra de Expediente (Seg a Sex das 08h as 17h)
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
    // Muda o texto do botão para dar feedback visual ao cliente
    const btn = document.getElementById('btn-calcular');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "⏳ CALCULANDO...";
    btn.style.opacity = "0.7";

    let queryBusca = "";
    if (tipoBusca === 'cep') {
        queryBusca = `${document.getElementById('rua_pelo_cep').value}, ${document.getElementById('num_residencia_cep').value}, São Paulo, Brasil`;
    } else {
        queryBusca = `${document.getElementById('destino').value}, ${document.getElementById('num_residencia').value}, São Paulo, Brasil`;
    }
    
    try {
        // Integração API LocationIQ
        const resp = await fetch(`https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(queryBusca)}&format=json`);
        const data = await resp.json();
        
        if(data && data.length > 0) {
            const info = data[0];
            
            // Se a busca foi por rua, tenta extrair o bairro do LocationIQ
            if (tipoBusca === 'rua') {
                const partes = info.display_name.split(',');
                bairroGlobal = partes[1] ? partes[1].trim() : "São Paulo";
            }
            
            // Atualiza a tela com o bairro
            document.getElementById('res-bairro').innerText = bairroGlobal.toUpperCase();
            
            // Traça a Rota
            control.setWaypoints([ORIGEM_FIXA, L.latLng(info.lat, info.lon)]);
        } else { 
            alert("Endereço não localizado no mapa. Verifique se a rua está correta."); 
        }
    } catch (e) { 
        alert("Erro ao localizar endereço. Tente novamente."); 
    } finally {
        // Volta o botão ao normal
        btn.innerHTML = textoOriginal;
        btn.style.opacity = "1";
    }
}

// ==========================================
// CÁLCULO DE VALORES E TEMPO (Leaflet Routing)
// ==========================================
control.on('routesfound', function(e) {
    const routes = e.routes[0];
    const km = routes.summary.totalDistance / 1000;
    
    // Adiciona 5 min de margem ao tempo retornado
    const tempoMin = Math.round(routes.summary.totalTime / 60) + 5;
    tempoGlobal = tempoMin + " MIN";
    
    // Calcula o valor
    const calculoBase = km * VALOR_POR_KM;
    const valorFinal = Math.max(TAXA_MINIMA, calculoBase);
    
    // Preenche a tela de resumo
    document.getElementById('distancia').innerText = km.toFixed(2);
    document.getElementById('res-tempo').innerText = tempoGlobal;
    document.getElementById('valor').innerText = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Mostra o resumo e o aviso de taxa mínima se necessário
    document.getElementById('campo-resumo').style.display = 'block';
    document.getElementById('aviso-taxa').style.display = (calculoBase < TAXA_MINIMA ? 'block' : 'none');
    
    rotaCalculada = true;
    map.fitBounds(routes.bounds, {padding: [30, 30]});
});

// ==========================================
// ENVIO PARA WHATSAPP E PLANILHA
// ==========================================
function limpar() { location.reload(); }
function fecharModalExpediente() { document.getElementById('modalExpediente').style.display = 'none'; }
function fecharModal() { document.getElementById('avisoLucas').style.display = 'none'; }

function prepararEnvio() {
    if (!rotaCalculada) return alert("Por favor, calcule o valor do frete antes de enviar!");
    if (!document.getElementById('nome_cliente').value) return alert("Informe o nome do cliente!");
    document.getElementById('avisoLucas').style.display = 'flex';
}

function obterDataFormatada(dataInput) {
    if(!dataInput) return "---";
    const partes = dataInput.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // Formato DD/MM/AAAA
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

    // Formatação da Mensagem do WhatsApp
    let msg = `*NOVO PEDIDO - ALENCAR FRETES*%0A%0A`;
    msg += `📅 *DATA:* ${dados.data}%0A⏰ *HORA:* ${dados.hora}%0A👤 *CLIENTE:* ${dados.nome}%0A🏘️ *BAIRRO:* ${dados.bairro}%0A⏱️ *TEMPO ESTIMADO:* ${tempoGlobal}%0A🏁 *DESTINO:* ${dados.destino}%0A`;
    
    if(tipoResidencia === 'APTO') {
        msg += `🏢 *LOCAL:* Bloco ${dados.bloco} - Apto ${dados.apto}%0A`;
    }
    
    msg += `📍 *REF:* ${dados.ref}%0A📏 *DISTÂNCIA:* ${dados.km} km%0A💰 *VALOR:* ${dados.valor}`;

    // Envia para o Google Sheets em background
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dados) });
    
    // Abre o WhatsApp
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`, '_blank');
    
    fecharModal();
}
