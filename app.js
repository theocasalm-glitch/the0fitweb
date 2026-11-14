/* ========================================
   CONFIGURACIÓN GLOBAL
   ======================================== */
const STORAGE_KEY_GLOBAL = 'the0fit_global_profile';
const STORAGE_KEY_LAST_RESULTS = 'the0fit_last_results';

const CONVERSION = {
    kg_to_lbs: 2.20462,
    cm_to_inches: 0.393701,
    cm_to_feet: 0.0328084,
};

const ACTIVITY_FACTORS = {
    sedentario: 1.2,
    ligero: 1.375,
    moderado: 1.55,
    activo: 1.725,
    muyactivo: 1.9,
};

const ACTIVITY_LABELS = {
    sedentario: 'Sedentario (1.2)',
    ligero: 'Ligero (1.375)',
    moderado: 'Moderado (1.55)',
    activo: 'Activo (1.725)',
    muyactivo: 'Muy activo (1.9)',
};

const HYDRATION_MULTIPLIERS = {
    sedentario: 35,
    ligero: 37,
    moderado: 40,
    intenso: 45,
};

const IMC_CATEGORIES = {
    bajo: { min: 0, max: 18.4, label: 'Bajo peso', color: '#4ECDC4' },
    normal: { min: 18.5, max: 24.9, label: 'Peso normal', color: '#2ECC71' },
    sobrepeso: { min: 25, max: 29.9, label: 'Sobrepeso', color: '#F5B700' },
    obesidad1: { min: 30, max: 34.9, label: 'Obesidad Clase I', color: '#E74C3C' },
    obesidad2: { min: 35, max: 39.9, label: 'Obesidad Clase II', color: '#C0392B' },
    obesidad3: { min: 40, max: Infinity, label: 'Obesidad Clase III', color: '#A93226' },
};

let globalProfile = {};
let isCalorieMetric = true;
let isIMCMetric = true;
let isHydrationMetric = true;

/* ========================================
   INICIALIZACIÓN
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded - Inicializando The0fit');
    loadGlobalProfile();
    setupAllCalculators();
    setupNavigationListeners();
    setupEscapeKey();
    displayQuickSummary();
    setTimeout(() => {
        setupIconLibrary();
    }, 100);
});

/* ========================================
   LIBRERÍA DE ICONOS (LUCIDE)
   ======================================== */
function setupIconLibrary() {
    lucide.createIcons();
}

/* ========================================
   NAVEGACIÓN
   ======================================== */
function setupNavigationListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn-active'));
            btn.classList.add('nav-btn-active');
        });
    });
}

function goToCalculator(type) {
    hideAllScreens();
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn-active'));

    if (type === 'calories') {
        document.getElementById('calorieScreen').classList.add('active');
        document.querySelector('[data-screen="calories"]').classList.add('nav-btn-active');
        cargarDatosCalorie();
    } else if (type === 'imc') {
        document.getElementById('imcScreen').classList.add('active');
        document.querySelector('[data-screen="imc"]').classList.add('nav-btn-active');
        cargarDatosIMC();
    } else if (type === 'hydration') {
        document.getElementById('hydrationScreen').classList.add('active');
        document.querySelector('[data-screen="hydration"]').classList.add('nav-btn-active');
        cargarDatosHydration();
    } else {
        document.getElementById('homeScreen').classList.add('active');
        document.querySelector('[data-screen="home"]').classList.add('nav-btn-active');
    }
}

function goToHome() {
    goToCalculator('home');
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
}

/* ========================================
   SINCRONIZACIÓN GLOBAL Y LOCALSTORAGE
   ======================================== */
function saveGlobalProfile() {
    localStorage.setItem(STORAGE_KEY_GLOBAL, JSON.stringify(globalProfile));
}

function loadGlobalProfile() {
    const saved = localStorage.getItem(STORAGE_KEY_GLOBAL);
    if (saved) {
        globalProfile = JSON.parse(saved);
    }
}

function displayQuickSummary() {
    const results = localStorage.getItem(STORAGE_KEY_LAST_RESULTS);
    if (results) {
        const { tdee, imc } = JSON.parse(results);
        const summaryEl = document.getElementById('quickSummary');
        const summaryValue = document.getElementById('summaryValue');
        if (tdee) {
            summaryValue.textContent = `${Math.round(tdee)} kcal/día · ${imc ? 'IMC: ' + imc.toFixed(1) : ''}`;
            summaryEl.style.display = 'block';
        }
    }
}

/* ========================================
   SETUP CALCULADORA DE CALORÍAS
   ======================================== */
function setupAllCalculators() {
    setupCalorieCalculator();
    setupIMCCalculator();
    setupHydrationCalculator();
}

function setupCalorieCalculator() {
    console.log('setupCalorieCalculator called');
    const form = document.getElementById('calorieForm');
    console.log('calorieForm element:', form);
    if (form) {
        form.addEventListener('submit', (e) => {
            console.log('Form submitted - event fired');
            try {
                handleCalorieSubmit(e);
            } catch (error) {
                console.error('Error en handleCalorieSubmit:', error);
            }
        });
        form.addEventListener('reset', handleCalorieReset);
        console.log('Event listeners agregados al formulario de calorías');
    } else {
        console.error('calorieForm NO ENCONTRADO');
    }

    ['edad', 'peso', 'altura'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const errEl = document.getElementById(`${id}Error`);
                if (errEl) errEl.textContent = '';
            });
        }
    });

    document.querySelectorAll('input[name="sexo"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const errEl = document.getElementById('sexoError');
            if (errEl) errEl.textContent = '';
        });
    });

    document.querySelectorAll('input[name="actividad"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const errEl = document.getElementById('actividadError');
            if (errEl) errEl.textContent = '';
        });
    });
}

function toggleCalorieUnitsNew(unit) {
    const buttons = document.querySelectorAll('[data-unit]');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
    });

    const pesoInput = document.getElementById('peso');
    const alturaInput = document.getElementById('altura');
    const pesoUnit = document.getElementById('pesoUnit');
    const alturaUnit = document.getElementById('alturaUnit');

    isCalorieMetric = unit === 'metric';

    if (!isCalorieMetric) {
        const peso = parseFloat(pesoInput.value);
        const altura = parseFloat(alturaInput.value);

        if (peso) pesoInput.value = (peso * CONVERSION.kg_to_lbs).toFixed(1);
        if (altura) {
            const feet = Math.floor(altura * CONVERSION.cm_to_feet);
            const inches = ((altura * CONVERSION.cm_to_inches) % 12).toFixed(0);
            alturaInput.value = `${feet}'${inches}"`;
        }

        pesoUnit.textContent = 'lbs';
        alturaUnit.textContent = 'ft-in';
        pesoInput.step = '0.5';
    } else {
        const peso = parseFloat(pesoInput.value);
        const alturaValue = alturaInput.value;

        if (peso) pesoInput.value = (peso / CONVERSION.kg_to_lbs).toFixed(1);
        if (alturaValue) {
            const matches = alturaValue.match(/(\d+)'(\d+)"/);
            if (matches) {
                const feet = parseInt(matches[1]);
                const inches = parseInt(matches[2]);
                const totalCm = (feet * 30.48) + (inches * 2.54);
                alturaInput.value = totalCm.toFixed(1);
            }
        }

        pesoUnit.textContent = 'kg';
        alturaUnit.textContent = 'cm';
        pesoInput.step = '0.1';
    }

    guardarDatosCalorie();
}

function handleCalorieSubmit(e) {
    console.log('handleCalorieSubmit iniciado');
    e.preventDefault();
    console.log('preventDefault ejecutado');

    console.log('Validando formulario de calorías...');
    if (!validarCalorie()) {
        console.log('Validación falló - retornando');
        return;
    }
    console.log('Validación pasó');

    guardarDatosCalorie();

    const sexo = document.querySelector('input[name="sexo"]:checked').value;
    let peso = parseFloat(document.getElementById('peso').value);
    let altura = parseFloat(document.getElementById('altura').value);
    const edad = parseFloat(document.getElementById('edad').value);
    const actividad = document.querySelector('input[name="actividad"]:checked').value;

    if (!isCalorieMetric) {
        peso = peso / CONVERSION.kg_to_lbs;
        const matches = document.getElementById('altura').value.match(/(\d+)'(\d+)"/);
        if (matches) {
            const feet = parseInt(matches[1]);
            const inches = parseInt(matches[2]);
            altura = (feet * 30.48) + (inches * 2.54);
        }
    }

    const bmr = calcularBMR(peso, altura, edad, sexo);
    const tdee = bmr * ACTIVITY_FACTORS[actividad];
    const definicion = tdee * 0.8;
    const volumen = tdee * 1.15;

    const macrosMantenimiento = calcularMacros(tdee, peso);
    const macrosDefinicion = calcularMacrosDefinicion(definicion, peso);
    const macrosVolumen = calcularMacrosVolumen(volumen, peso);

    guardarResultados({ tdee });

    mostrarResultadoCalorie(
        bmr, tdee, definicion, volumen,
        macrosMantenimiento, macrosDefinicion, macrosVolumen,
        actividad, ACTIVITY_FACTORS[actividad]
    );
}

function handleCalorieReset() {
    document.querySelectorAll('#calorieForm .error-message').forEach(el => {
        el.textContent = '';
    });
}

function validarCalorie() {
    let valido = true;

    if (!document.querySelector('input[name="sexo"]:checked')) {
        document.getElementById('sexoError').textContent = 'Por favor selecciona un sexo';
        valido = false;
    }

    const edad = parseFloat(document.getElementById('edad').value);
    if (!edad || edad < 13 || edad > 120) {
        document.getElementById('edadError').textContent = 'Edad debe estar entre 13 y 120 años';
        valido = false;
    }

    const peso = parseFloat(document.getElementById('peso').value);
    const minPeso = isCalorieMetric ? 30 : 66;
    const maxPeso = isCalorieMetric ? 300 : 660;
    if (!peso || peso < minPeso || peso > maxPeso) {
        document.getElementById('pesoError').textContent = `Peso debe estar entre ${minPeso} y ${maxPeso}`;
        valido = false;
    }

    const altura = parseFloat(document.getElementById('altura').value);
    const minAltura = isCalorieMetric ? 100 : 3;
    const maxAltura = isCalorieMetric ? 250 : 8;
    if (!altura || altura < minAltura || altura > maxAltura) {
        document.getElementById('alturaError').textContent = `Altura debe estar entre ${minAltura} y ${maxAltura}`;
        valido = false;
    }

    if (!document.querySelector('input[name="actividad"]:checked')) {
        document.getElementById('actividadError').textContent = 'Por favor selecciona un nivel de actividad';
        valido = false;
    }

    return valido;
}

/* ========================================
   SETUP CALCULADORA IMC
   ======================================== */
function setupIMCCalculator() {
    const form = document.getElementById('imcForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            console.log('IMC Form submitted');
            handleIMCSubmit(e);
        });
        form.addEventListener('reset', handleIMCReset);
    }

    ['imcPeso', 'imcAltura'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const errEl = document.getElementById(`${id}Error`);
                if (errEl) errEl.textContent = '';
            });
        }
    });
}

function toggleIMCUnitsNew(unit) {
    const buttons = document.querySelectorAll('#imcScreen [data-unit]');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
    });

    const pesoInput = document.getElementById('imcPeso');
    const alturaInput = document.getElementById('imcAltura');
    const pesoUnit = document.getElementById('imcPesoUnit');
    const alturaUnit = document.getElementById('imcAlturaUnit');

    isIMCMetric = unit === 'metric';

    if (!isIMCMetric) {
        const peso = parseFloat(pesoInput.value);
        const altura = parseFloat(alturaInput.value);

        if (peso) pesoInput.value = (peso * CONVERSION.kg_to_lbs).toFixed(1);
        if (altura) {
            const feet = Math.floor(altura * CONVERSION.cm_to_feet);
            const inches = ((altura * CONVERSION.cm_to_inches) % 12).toFixed(0);
            alturaInput.value = `${feet}'${inches}"`;
        }

        pesoUnit.textContent = 'lbs';
        alturaUnit.textContent = 'ft-in';
        pesoInput.step = '0.5';
    } else {
        const peso = parseFloat(pesoInput.value);
        const alturaValue = alturaInput.value;

        if (peso) pesoInput.value = (peso / CONVERSION.kg_to_lbs).toFixed(1);
        if (alturaValue) {
            const matches = alturaValue.match(/(\d+)'(\d+)"/);
            if (matches) {
                const feet = parseInt(matches[1]);
                const inches = parseInt(matches[2]);
                const totalCm = (feet * 30.48) + (inches * 2.54);
                alturaInput.value = totalCm.toFixed(1);
            }
        }

        pesoUnit.textContent = 'kg';
        alturaUnit.textContent = 'cm';
        pesoInput.step = '0.1';
    }

    guardarDatosIMC();
}

function handleIMCSubmit(e) {
    e.preventDefault();

    if (!validarIMC()) return;

    guardarDatosIMC();

    let peso = parseFloat(document.getElementById('imcPeso').value);
    let altura = parseFloat(document.getElementById('imcAltura').value);

    if (!isIMCMetric) {
        peso = peso / CONVERSION.kg_to_lbs;
        const matches = document.getElementById('imcAltura').value.match(/(\d+)'(\d+)"/);
        if (matches) {
            const feet = parseInt(matches[1]);
            const inches = parseInt(matches[2]);
            altura = (feet * 30.48) + (inches * 2.54);
        }
    }

    const imc = calcularIMC(peso, altura);
    guardarResultados({ imc });
    mostrarResultadoIMC(imc, altura);
}

function handleIMCReset() {
    document.querySelectorAll('#imcForm .error-message').forEach(el => {
        el.textContent = '';
    });
}

function validarIMC() {
    let valido = true;

    const peso = parseFloat(document.getElementById('imcPeso').value);
    const minPeso = isIMCMetric ? 30 : 66;
    const maxPeso = isIMCMetric ? 300 : 660;
    if (!peso || peso < minPeso || peso > maxPeso) {
        document.getElementById('imcPesoError').textContent = `Peso debe estar entre ${minPeso} y ${maxPeso}`;
        valido = false;
    }

    const altura = parseFloat(document.getElementById('imcAltura').value);
    const minAltura = isIMCMetric ? 100 : 3;
    const maxAltura = isIMCMetric ? 250 : 8;
    if (!altura || altura < minAltura || altura > maxAltura) {
        document.getElementById('imcAlturaError').textContent = `Altura debe estar entre ${minAltura} y ${maxAltura}`;
        valido = false;
    }

    return valido;
}

/* ========================================
   SETUP CALCULADORA HIDRATACIÓN
   ======================================== */
function setupHydrationCalculator() {
    const form = document.getElementById('hydrationForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            console.log('Hydration Form submitted');
            handleHydrationSubmit(e);
        });
        form.addEventListener('reset', handleHydrationReset);
    }

    const pesoEl = document.getElementById('hydrationPeso');
    if (pesoEl) {
        pesoEl.addEventListener('input', () => {
            const errEl = document.getElementById('hydrationPesoError');
            if (errEl) errEl.textContent = '';
        });
    }

    document.querySelectorAll('input[name="hydrationActividad"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const errEl = document.getElementById('hydrationActividadError');
            if (errEl) errEl.textContent = '';
        });
    });
}

function toggleHydrationUnitsNew(unit) {
    const buttons = document.querySelectorAll('#hydrationScreen [data-unit]');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
    });

    const pesoInput = document.getElementById('hydrationPeso');
    const pesoUnit = document.getElementById('hydrationPesoUnit');

    isHydrationMetric = unit === 'metric';

    if (!isHydrationMetric) {
        const peso = parseFloat(pesoInput.value);
        if (peso) pesoInput.value = (peso * CONVERSION.kg_to_lbs).toFixed(1);
        pesoUnit.textContent = 'lbs';
    } else {
        const peso = parseFloat(pesoInput.value);
        if (peso) pesoInput.value = (peso / CONVERSION.kg_to_lbs).toFixed(1);
        pesoUnit.textContent = 'kg';
    }

    guardarDatosHydration();
}

function handleHydrationSubmit(e) {
    e.preventDefault();

    if (!validarHydration()) return;

    guardarDatosHydration();

    let peso = parseFloat(document.getElementById('hydrationPeso').value);
    const actividad = document.getElementById('hydrationForm').querySelector('input[name="hydrationActividad"]:checked').value;

    if (!isHydrationMetric) {
        peso = peso / CONVERSION.kg_to_lbs;
    }

    const litros = calcularHydration(peso, actividad);
    mostrarResultadoHydration(litros);
}

function handleHydrationReset() {
    document.querySelectorAll('#hydrationForm .error-message').forEach(el => {
        el.textContent = '';
    });
}

function validarHydration() {
    let valido = true;

    const peso = parseFloat(document.getElementById('hydrationPeso').value);
    const minPeso = isHydrationMetric ? 30 : 66;
    const maxPeso = isHydrationMetric ? 300 : 660;
    if (!peso || peso < minPeso || peso > maxPeso) {
        document.getElementById('hydrationPesoError').textContent = `Peso debe estar entre ${minPeso} y ${maxPeso}`;
        valido = false;
    }

    if (!document.getElementById('hydrationForm').querySelector('input[name="hydrationActividad"]:checked')) {
        document.getElementById('hydrationActividadError').textContent = 'Por favor selecciona un nivel de actividad';
        valido = false;
    }

    return valido;
}

/* ========================================
   CÁLCULOS - CALORÍAS
   ======================================== */
function calcularBMR(peso, altura, edad, sexo) {
    if (sexo === 'masculino') {
        return (10 * peso) + (6.25 * altura) - (5 * edad) + 5;
    } else {
        return (10 * peso) + (6.25 * altura) - (5 * edad) - 161;
    }
}

function calcularMacros(tdee, peso) {
    const proteinaG = peso * 2;
    const proteinaCal = proteinaG * 4;
    const grasasG = peso * 0.9;
    const grasasCal = grasasG * 9;
    const carbohidratosCal = tdee - proteinaCal - grasasCal;
    const carbohidratosG = carbohidratosCal / 4;

    return {
        proteina: { g: Math.round(proteinaG), cal: Math.round(proteinaCal), pct: 30 },
        carbohidratos: { g: Math.round(carbohidratosG), cal: Math.round(carbohidratosCal), pct: 45 },
        grasas: { g: Math.round(grasasG), cal: Math.round(grasasCal), pct: 25 },
    };
}

function calcularMacrosDefinicion(tdee, peso) {
    const proteinaG = peso * 2.2;
    const proteinaCal = proteinaG * 4;
    const grasasG = peso * 0.9;
    const grasasCal = grasasG * 9;
    const carbohidratosCal = tdee - proteinaCal - grasasCal;
    const carbohidratosG = carbohidratosCal / 4;

    return {
        proteina: { g: Math.round(proteinaG), cal: Math.round(proteinaCal), pct: 35 },
        carbohidratos: { g: Math.round(carbohidratosG), cal: Math.round(carbohidratosCal), pct: 40 },
        grasas: { g: Math.round(grasasG), cal: Math.round(grasasCal), pct: 25 },
    };
}

function calcularMacrosVolumen(tdee, peso) {
    const proteinaG = peso * 1.8;
    const proteinaCal = proteinaG * 4;
    const grasasG = peso * 0.8;
    const grasasCal = grasasG * 9;
    const carbohidratosCal = tdee - proteinaCal - grasasCal;
    const carbohidratosG = carbohidratosCal / 4;

    return {
        proteina: { g: Math.round(proteinaG), cal: Math.round(proteinaCal), pct: 30 },
        carbohidratos: { g: Math.round(carbohidratosG), cal: Math.round(carbohidratosCal), pct: 50 },
        grasas: { g: Math.round(grasasG), cal: Math.round(grasasCal), pct: 20 },
    };
}

/* ========================================
   CÁLCULOS - IMC
   ======================================== */
function calcularIMC(peso, altura) {
    const alturaM = altura / 100;
    return peso / (alturaM * alturaM);
}

function obtenerCategoriaIMC(imc) {
    for (const [key, cat] of Object.entries(IMC_CATEGORIES)) {
        if (imc >= cat.min && imc <= cat.max) {
            return [key, cat];
        }
    }
    return ['normal', IMC_CATEGORIES.normal];
}

function calcularRangoSaludable(altura) {
    const alturaM = altura / 100;
    const minPeso = 18.5 * (alturaM * alturaM);
    const maxPeso = 24.9 * (alturaM * alturaM);
    return { min: minPeso, max: maxPeso };
}

function calcularPosicionBalanza(imc) {
    const minIMC = 15;
    const maxIMC = 42;
    const rango = maxIMC - minIMC;

    const normalizado = (imc - minIMC) / rango;
    const clamped = Math.max(0, Math.min(1, normalizado));

    const startX = 30;
    const endX = 370;
    const startY = 180;
    const topY = 40;

    const x = startX + (clamped * (endX - startX));
    const t = clamped;
    const y = startY - ((1 - ((t - 0.5) * (t - 0.5) * 4)) * (startY - topY));

    return { x, y };
}

/* ========================================
   CÁLCULOS - HIDRATACIÓN
   ======================================== */
function calcularHydration(peso, actividad) {
    const multiplier = HYDRATION_MULTIPLIERS[actividad] || 35;
    return peso * multiplier / 1000;
}

/* ========================================
   ANIMACIÓN DE NÚMEROS
   ======================================== */
function animarNumero(elemento, desde, hasta, duracion = 800) {
    const inicio = Date.now();

    function actualizar() {
        const ahora = Date.now();
        const progreso = Math.min((ahora - inicio) / duracion, 1);
        const valor = Math.floor(desde + (hasta - desde) * progreso);
        elemento.textContent = valor.toLocaleString();

        if (progreso < 1) {
            requestAnimationFrame(actualizar);
        }
    }

    requestAnimationFrame(actualizar);
}

function animarNumeroDecimal(elemento, desde, hasta, decimales = 1, duracion = 800) {
    const inicio = Date.now();

    function actualizar() {
        const ahora = Date.now();
        const progreso = Math.min((ahora - inicio) / duracion, 1);
        const valor = desde + (hasta - desde) * progreso;
        elemento.textContent = valor.toFixed(decimales);

        if (progreso < 1) {
            requestAnimationFrame(actualizar);
        }
    }

    requestAnimationFrame(actualizar);
}

/* ========================================
   MOSTRAR RESULTADOS - CALORÍAS
   ======================================== */
function mostrarResultadoCalorie(bmr, tdee, definicion, volumen, macrosMantenimiento, macrosDefinicion, macrosVolumen, actividad, activityFactor) {
    const maintenanceCalDiv = document.getElementById('maintenanceCalories');
    animarNumero(maintenanceCalDiv, 0, Math.round(tdee), 800);

    document.getElementById('maintenanceProtein').textContent = macrosMantenimiento.proteina.g + 'g';
    document.getElementById('maintenanceProteinCal').textContent = macrosMantenimiento.proteina.cal + ' cal';
    document.getElementById('maintenanceCarbs').textContent = macrosMantenimiento.carbohidratos.g + 'g';
    document.getElementById('maintenanceCarbsCal').textContent = macrosMantenimiento.carbohidratos.cal + ' cal';
    document.getElementById('maintenanceFats').textContent = macrosMantenimiento.grasas.g + 'g';
    document.getElementById('maintenanceFatsCal').textContent = macrosMantenimiento.grasas.cal + ' cal';
    document.getElementById('maintenanceBMR').textContent = Math.round(bmr);
    document.getElementById('maintenanceActivity').textContent = ACTIVITY_LABELS[actividad];

    const definicionCalDiv = document.getElementById('definicionCalories');
    animarNumero(definicionCalDiv, 0, Math.round(definicion), 800);

    document.getElementById('definicionProtein').textContent = macrosDefinicion.proteina.g + 'g';
    document.getElementById('definicionProteinCal').textContent = macrosDefinicion.proteina.cal + ' cal';
    document.getElementById('definicionCarbs').textContent = macrosDefinicion.carbohidratos.g + 'g';
    document.getElementById('definicionCarbsCal').textContent = macrosDefinicion.carbohidratos.cal + ' cal';
    document.getElementById('definicionFats').textContent = macrosDefinicion.grasas.g + 'g';
    document.getElementById('definicionFatsCal').textContent = macrosDefinicion.grasas.cal + ' cal';

    const volumenCalDiv = document.getElementById('volumenCalories');
    animarNumero(volumenCalDiv, 0, Math.round(volumen), 800);

    document.getElementById('volumenProtein').textContent = macrosVolumen.proteina.g + 'g';
    document.getElementById('volumenProteinCal').textContent = macrosVolumen.proteina.cal + ' cal';
    document.getElementById('volumenCarbs').textContent = macrosVolumen.carbohidratos.g + 'g';
    document.getElementById('volumenCarbsCal').textContent = macrosVolumen.carbohidratos.cal + ' cal';
    document.getElementById('volumenFats').textContent = macrosVolumen.grasas.g + 'g';
    document.getElementById('volumenFatsCal').textContent = macrosVolumen.grasas.cal + ' cal';

    console.log('Intentando abrir calorieModal...');
    const modal = document.getElementById('calorieModal');
    console.log('Modal encontrado?', !!modal);
    if (modal) {
        modal.classList.add('active');
        console.log('Modal abierto - clase "active" agregada');
    } else {
        console.error('calorieModal NO ENCONTRADO');
    }
    lucide.createIcons();
}

/* ========================================
   MOSTRAR RESULTADOS - IMC
   ======================================== */
function mostrarResultadoIMC(imc, altura) {
    const [categoryKey, categoria] = obtenerCategoriaIMC(imc);
    const imcDiv = document.getElementById('imcResultado');

    animarNumeroDecimal(imcDiv, 0, imc, 1, 800);

    document.getElementById('imcCategoria').textContent = categoria.label;

    document.querySelectorAll('.category-row').forEach(row => {
        row.classList.remove('highlighted');
        if (row.dataset.category === categoryKey) {
            row.classList.add('highlighted');
        }
    });

    const rango = calcularRangoSaludable(altura);
    document.getElementById('imcHealthyRange').textContent =
        `${rango.min.toFixed(1)} - ${rango.max.toFixed(1)} kg (según tu altura)`;

    let advice = '';
    if (imc < 18.5) {
        advice = `<strong>Tu IMC es ${imc.toFixed(1)}</strong> (${categoria.label}). Considera aumentar tu consumo calórico con alimentos nutritivos.`;
    } else if (imc < 25) {
        advice = `<strong>Tu IMC es ${imc.toFixed(1)}</strong> (${categoria.label}). ¡Excelente composición corporal! Mantén tu estilo de vida saludable.`;
    } else if (imc < 30) {
        advice = `<strong>Tu IMC es ${imc.toFixed(1)}</strong> (${categoria.label}). Considera ajustar tu dieta e incrementar la actividad física.`;
    } else if (imc < 35) {
        advice = `<strong>Tu IMC es ${imc.toFixed(1)}</strong> (${categoria.label}). Te recomendamos buscar orientación profesional para un plan personalizado.`;
    } else if (imc < 40) {
        advice = `<strong>Tu IMC es ${imc.toFixed(1)}</strong> (${categoria.label}). Consulta con un médico y nutricionista profesional.`;
    } else {
        advice = `<strong>Tu IMC es ${imc.toFixed(1)}</strong> (${categoria.label}). Es importante buscar atención médica profesional.`;
    }

    document.getElementById('imcAdvice').innerHTML = `<strong>💡 Consejo:</strong><br>${advice}<br><br>• El IMC es una referencia inicial que no considera composición corporal<br>• Consulta con profesionales para un análisis más completo<br>• Tu salud es más importante que un número`;

    document.getElementById('imcModal').classList.add('active');
    lucide.createIcons();
}

/* ========================================
   MOSTRAR RESULTADOS - HIDRATACIÓN
   ======================================== */
function mostrarResultadoHydration(litros) {
    const hydrationDiv = document.getElementById('hydrationResultado');
    animarNumeroDecimal(hydrationDiv, 0, litros, 1, 800);

    const perHour = (litros / 16).toFixed(2);
    const glasses = Math.round(litros * 4);

    document.getElementById('hydrationPerHour').textContent = `${perHour} L`;
    document.getElementById('hydrationGlasses').textContent = `${glasses} vasos`;

    document.getElementById('hydrationAdvice').innerHTML = `
        <strong>💧 Recomendaciones:</strong><br>
        • Distribuye tu consumo a lo largo del día<br>
        • Aumenta la ingesta durante el ejercicio<br>
        • Bebe más en climas cálidos<br>
        • La ingesta de agua varía según alimentos consumidos
    `;

    document.getElementById('hydrationModal').classList.add('active');
    lucide.createIcons();
}

/* ========================================
   MANEJO DE TABS
   ======================================== */
function cambiarTab(e, type) {
    const btn = e.target;
    const tabName = btn.dataset.tab;

    const selector = type === 'calorie' ? '#calorieModal' : '#imcModal';
    const modal = document.querySelector(selector);

    modal.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
    });

    modal.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.tabPane === tabName);
    });
}

/* ========================================
   MANEJO DE MODALES
   ======================================== */
function cerrarModal(type) {
    const modal = type === 'calorie' ? document.getElementById('calorieModal') :
                  type === 'imc' ? document.getElementById('imcModal') :
                  document.getElementById('hydrationModal');
    modal.classList.remove('active');
}

function setupEscapeKey() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('calorieModal').classList.remove('active');
            document.getElementById('imcModal').classList.remove('active');
            document.getElementById('hydrationModal').classList.remove('active');
        }
    });

    [document.getElementById('calorieModal'), document.getElementById('imcModal'), document.getElementById('hydrationModal')].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

/* ========================================
   COPIAR Y COMPARTIR
   ======================================== */
function copiarPlan(type) {
    let texto = '';

    if (type === 'calorie') {
        const tdee = document.getElementById('maintenanceCalories').textContent;
        const protein = document.getElementById('maintenanceProtein').textContent;
        const carbs = document.getElementById('maintenanceCarbs').textContent;
        const fats = document.getElementById('maintenanceFats').textContent;
        texto = `Plan de Calorías - The0fit\n\nCALORÍAS DIARIAS: ${tdee}\n\nMACROS:\nProteínas: ${protein}\nCarbohidratos: ${carbs}\nGrasas: ${fats}`;
    } else if (type === 'imc') {
        const imc = document.getElementById('imcResultado').textContent;
        const categoria = document.getElementById('imcCategoria').textContent;
        const rango = document.getElementById('imcHealthyRange').textContent;
        texto = `Resultado IMC - The0fit\n\nIMC: ${imc}\nCategoría: ${categoria}\nRango Saludable: ${rango}`;
    } else if (type === 'hydration') {
        const litros = document.getElementById('hydrationResultado').textContent;
        const perHour = document.getElementById('hydrationPerHour').textContent;
        const glasses = document.getElementById('hydrationGlasses').textContent;
        texto = `Hidratación Diaria - The0fit\n\nLitros por día: ${litros}\nPor hora: ${perHour}\nVasos: ${glasses}`;
    }

    navigator.clipboard.writeText(texto).then(() => {
        mostrarToast('¡Copiado al portapapeles!');
    });
}

function compartirPlan(type) {
    let titulo = '';
    let texto = '';

    if (type === 'calorie') {
        titulo = 'Mi plan de calorías en The0fit';
        const tdee = document.getElementById('maintenanceCalories').textContent;
        texto = `Mis calorías diarias: ${tdee} kcal. Calcula el tuyo en The0fit`;
    } else if (type === 'imc') {
        titulo = 'Mi IMC en The0fit';
        const imc = document.getElementById('imcResultado').textContent;
        const categoria = document.getElementById('imcCategoria').textContent;
        texto = `Mi IMC: ${imc} (${categoria}). Calcula el tuyo en The0fit`;
    } else if (type === 'hydration') {
        titulo = 'Mi hidratación diaria en The0fit';
        const litros = document.getElementById('hydrationResultado').textContent;
        texto = `Necesito ${litros}L de agua al día. Calcula tu hidratación en The0fit`;
    }

    if (navigator.share) {
        navigator.share({
            title: titulo,
            text: texto,
        });
    } else {
        mostrarToast('Compartir no disponible en tu dispositivo');
    }
}

function mostrarToast(mensaje) {
    const toast = document.getElementById('toastNotification');
    toast.textContent = mensaje;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

/* ========================================
   PERSISTENCIA - CALORÍAS
   ======================================== */
function guardarDatosCalorie() {
    const datos = {
        sexo: document.querySelector('input[name="sexo"]:checked')?.value,
        edad: document.getElementById('edad').value,
        peso: document.getElementById('peso').value,
        altura: document.getElementById('altura').value,
        actividad: document.querySelector('input[name="actividad"]:checked')?.value,
        isMetric: isCalorieMetric,
    };
    globalProfile = { ...globalProfile, ...datos };
    saveGlobalProfile();
}

function cargarDatosCalorie() {
    if (globalProfile.peso) document.getElementById('peso').value = globalProfile.peso;
    if (globalProfile.altura) document.getElementById('altura').value = globalProfile.altura;
    if (globalProfile.edad) document.getElementById('edad').value = globalProfile.edad;
    if (globalProfile.sexo) {
        const radioBtn = document.getElementById(globalProfile.sexo === 'masculino' ? 'male' : 'female');
        if (radioBtn) radioBtn.checked = true;
    }
    if (globalProfile.actividad) {
        const actividadBtn = document.querySelector(`input[name="actividad"][value="${globalProfile.actividad}"]`);
        if (actividadBtn) actividadBtn.checked = true;
    }

    if (globalProfile.isMetric === false) {
        document.querySelectorAll('#calorieScreen [data-unit]')[1].classList.add('active');
        document.querySelectorAll('#calorieScreen [data-unit]')[0].classList.remove('active');
        toggleCalorieUnitsNew('imperial');
    }
}

/* ========================================
   PERSISTENCIA - IMC
   ======================================== */
function guardarDatosIMC() {
    const datos = {
        peso: document.getElementById('imcPeso').value,
        altura: document.getElementById('imcAltura').value,
        isMetric: isIMCMetric,
    };
    globalProfile = { ...globalProfile, ...datos };
    saveGlobalProfile();
}

function cargarDatosIMC() {
    if (globalProfile.peso) document.getElementById('imcPeso').value = globalProfile.peso;
    if (globalProfile.altura) document.getElementById('imcAltura').value = globalProfile.altura;

    if (globalProfile.isMetric === false) {
        document.querySelectorAll('#imcScreen [data-unit]')[1].classList.add('active');
        document.querySelectorAll('#imcScreen [data-unit]')[0].classList.remove('active');
        toggleIMCUnitsNew('imperial');
    }
}

/* ========================================
   PERSISTENCIA - HIDRATACIÓN
   ======================================== */
function guardarDatosHydration() {
    const datos = {
        peso: document.getElementById('hydrationPeso').value,
        isMetric: isHydrationMetric,
    };
    globalProfile = { ...globalProfile, ...datos };
    saveGlobalProfile();
}

function cargarDatosHydration() {
    if (globalProfile.peso) document.getElementById('hydrationPeso').value = globalProfile.peso;

    if (globalProfile.isMetric === false) {
        document.querySelectorAll('#hydrationScreen [data-unit]')[1].classList.add('active');
        document.querySelectorAll('#hydrationScreen [data-unit]')[0].classList.remove('active');
        toggleHydrationUnitsNew('imperial');
    }
}

/* ========================================
   PERSISTENCIA - RESULTADOS
   ======================================== */
function guardarResultados(results) {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_RESULTS) || '{}');
    const updated = { ...existing, ...results, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY_LAST_RESULTS, JSON.stringify(updated));
    displayQuickSummary();
}
