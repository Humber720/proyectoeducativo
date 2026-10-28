
interface Estudiante {
    ci: string;
    nombre: string;
    curso: string;
}

interface Nota {
    ci: string;
    calificacion: number;
}

interface RegistroAsistencia {
    ci: string;
    estado: string;
}

interface ResultadoAnalisis {
    estudiante: string;
    calificaciones: number[];
    promedio: number;
    nivel: string;
    recomendacion: string;
}

const API = "https://proyectoeducativo-go.onrender.com/estudiantes";
const API_ANALISIS = "https://proyectoeducativo-go.onrender.com/analizar";

const formulario = document.getElementById("formEstudiante") as HTMLFormElement;
const lista = document.getElementById("listaEstudiantes") as HTMLUListElement;

const formularioNota = document.getElementById("formNota") as HTMLFormElement;
const listaNotas = document.getElementById("listaNotas") as HTMLUListElement;

const formularioAsistencia = document.getElementById("formAsistencia") as HTMLFormElement;
const listaAsistencia = document.getElementById("listaAsistencia") as HTMLUListElement;

const selectorNota = document.getElementById("estudianteNota") as HTMLSelectElement;
const botonAnalizar = document.getElementById("btnAnalizar") as HTMLButtonElement;
const resultadoAnalisis = document.getElementById("resultadoAnalisis") as HTMLDivElement;

const estudiantes: Estudiante[] = [];
const notas: Nota[] = [];
const asistencias: RegistroAsistencia[] = [];

function actualizarSelectores(): void {
    const selectores = [
        selectorNota,
        document.getElementById("estudianteAsistencia") as HTMLSelectElement
    ];

    selectores.forEach(selector => {
        selector.innerHTML = '<option value="">Seleccione un estudiante</option>';

        estudiantes.forEach(estudiante => {
            const opcion = document.createElement("option");
            opcion.value = estudiante.ci;
            opcion.textContent = `${estudiante.ci} - ${estudiante.nombre}`;
            selector.appendChild(opcion);
        });
    });
}

function mostrarEstudiante(estudiante: Estudiante): void {
    const elemento = document.createElement("li");
    elemento.textContent =
        `C.I.: ${estudiante.ci} - ${estudiante.nombre} - ${estudiante.curso}`;
    lista.appendChild(elemento);
}

async function cargarEstudiantes(): Promise<void> {
    try {
        const respuesta = await fetch(API);

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los estudiantes.");
        }

        const datos: Estudiante[] = await respuesta.json();

        estudiantes.length = 0;
        lista.innerHTML = "";

        datos.forEach(estudiante => {
            estudiantes.push(estudiante);
            mostrarEstudiante(estudiante);
        });

        actualizarSelectores();
    } catch (error) {
        console.error(error);
        alert("No se pudo conectar con Go. Compruebe que el servidor esté funcionando.");
    }
}

// REGISTRAR ESTUDIANTE EN GO Y VALIDAR CON RUST
formulario.addEventListener("submit", async (evento: SubmitEvent) => {
    evento.preventDefault();

    const ci = (document.getElementById("ci") as HTMLInputElement).value.trim();
    const nombre = (document.getElementById("nombre") as HTMLInputElement).value.trim();
    const curso = (document.getElementById("curso") as HTMLInputElement).value.trim();

    if (!ci || !nombre || !curso) {
        alert("Complete todos los campos.");
        return;
    }

    if (estudiantes.some(e => e.ci === ci)) {
        alert("Este C.I. ya está registrado.");
        return;
    }

    try {
        const respuesta = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ci, nombre, curso })
        });

        if (respuesta.status === 409) {
            alert("Este C.I. ya existe en el servidor.");
            return;
        }

        if (!respuesta.ok) {
            const detalle = await respuesta.text();
            throw new Error(detalle || "Error al registrar el estudiante.");
        }

        const estudiante: Estudiante = await respuesta.json();

        estudiantes.push(estudiante);
        mostrarEstudiante(estudiante);
        actualizarSelectores();
        formulario.reset();

        alert("Estudiante registrado correctamente en Go.");
    } catch (error) {
        console.error(error);
        alert("No se pudo registrar. Verifique que Go y Rust estén funcionando.");
    }
});

// REGISTRAR NOTA TEMPORALMENTE EN LA PÁGINA
formularioNota.addEventListener("submit", (evento: SubmitEvent) => {
    evento.preventDefault();

    const ci = selectorNota.value;
    const calificacion = Number(
        (document.getElementById("calificacion") as HTMLInputElement).value
    );

    if (!ci || !Number.isFinite(calificacion) ||
        calificacion < 0 || calificacion > 100) {
        alert("Seleccione un estudiante e introduzca una nota entre 0 y 100.");
        return;
    }

    notas.push({ ci, calificacion });

    const estudiante = estudiantes.find(e => e.ci === ci);
    const elemento = document.createElement("li");
    elemento.textContent = `${estudiante?.nombre}: ${calificacion} puntos`;
    listaNotas.appendChild(elemento);

    formularioNota.reset();
});

// ANALIZAR LAS NOTAS MEDIANTE GO Y PYTHON
botonAnalizar.addEventListener("click", async () => {
    const ci = selectorNota.value;

    if (!ci) {
        alert("Seleccione un estudiante en el formulario de notas.");
        return;
    }

    const estudiante = estudiantes.find(e => e.ci === ci);
    const notasEstudiante = notas
        .filter(nota => nota.ci === ci)
        .map(nota => nota.calificacion);

    if (!estudiante) {
        alert("No se encontró el estudiante seleccionado.");
        return;
    }

    if (notasEstudiante.length === 0) {
        alert("Primero registre al menos una nota para este estudiante.");
        return;
    }

    botonAnalizar.disabled = true;
    botonAnalizar.textContent = "Analizando...";
    resultadoAnalisis.textContent = "Enviando calificaciones a Python...";

    try {
        const respuesta = await fetch(API_ANALISIS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: estudiante.nombre,
                notas: notasEstudiante
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.error || "No se pudo realizar el análisis.");
        }

        const resultado = datos as ResultadoAnalisis;

        resultadoAnalisis.replaceChildren();

        const titulo = document.createElement("h4");
        titulo.textContent = "Resultado del análisis académico";

        const nombre = document.createElement("p");
        nombre.textContent = `Estudiante: ${resultado.estudiante}`;

        const calificaciones = document.createElement("p");
        calificaciones.textContent =
            `Calificaciones analizadas: ${resultado.calificaciones.join(", ")}`;

        const promedio = document.createElement("p");
        promedio.textContent = `Promedio: ${Number(resultado.promedio).toFixed(2)}`;

        const nivel = document.createElement("p");
        nivel.textContent = `Nivel de rendimiento: ${resultado.nivel}`;

        const recomendacion = document.createElement("p");
        recomendacion.textContent = `Recomendación: ${resultado.recomendacion}`;

        resultadoAnalisis.append(
            titulo,
            nombre,
            calificaciones,
            promedio,
            nivel,
            recomendacion
        );
    } catch (error) {
        console.error(error);
        resultadoAnalisis.textContent =
            error instanceof Error
                ? `Error en el análisis: ${error.message}`
                : "No se pudo conectar con el servicio de análisis.";
    } finally {
        botonAnalizar.disabled = false;
        botonAnalizar.textContent = "Analizar calificaciones";
    }
});

// REGISTRAR ASISTENCIA TEMPORALMENTE EN LA PÁGINA
formularioAsistencia.addEventListener("submit", (evento: SubmitEvent) => {
    evento.preventDefault();

    const ci = (
        document.getElementById("estudianteAsistencia") as HTMLSelectElement
    ).value;

    const estado = (
        document.getElementById("estadoAsistencia") as HTMLSelectElement
    ).value;

    if (!ci || !estado) {
        alert("Seleccione un estudiante y el estado de asistencia.");
        return;
    }

    asistencias.push({ ci, estado });

    const estudiante = estudiantes.find(e => e.ci === ci);
    const elemento = document.createElement("li");
    elemento.textContent = `${estudiante?.nombre}: ${estado}`;
    listaAsistencia.appendChild(elemento);

    formularioAsistencia.reset();
});

void cargarEstudiantes();
