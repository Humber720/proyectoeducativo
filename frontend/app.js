"use strict";
const API = "http://localhost:8080/estudiantes";
const API_ANALISIS = "http://localhost:8080/analizar";
const formulario = document.getElementById("formEstudiante");
const lista = document.getElementById("listaEstudiantes");
const formularioNota = document.getElementById("formNota");
const listaNotas = document.getElementById("listaNotas");
const formularioAsistencia = document.getElementById("formAsistencia");
const listaAsistencia = document.getElementById("listaAsistencia");
const selectorNota = document.getElementById("estudianteNota");
const botonAnalizar = document.getElementById("btnAnalizar");
const resultadoAnalisis = document.getElementById("resultadoAnalisis");
const estudiantes = [];
const notas = [];
const asistencias = [];
function actualizarSelectores() {
    const selectores = [
        selectorNota,
        document.getElementById("estudianteAsistencia")
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
function mostrarEstudiante(estudiante) {
    const elemento = document.createElement("li");
    elemento.textContent =
        `C.I.: ${estudiante.ci} - ${estudiante.nombre} - ${estudiante.curso}`;
    lista.appendChild(elemento);
}
async function cargarEstudiantes() {
    try {
        const respuesta = await fetch(API);
        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los estudiantes.");
        }
        const datos = await respuesta.json();
        estudiantes.length = 0;
        lista.innerHTML = "";
        datos.forEach(estudiante => {
            estudiantes.push(estudiante);
            mostrarEstudiante(estudiante);
        });
        actualizarSelectores();
    }
    catch (error) {
        console.error(error);
        alert("No se pudo conectar con Go. Compruebe que el servidor esté funcionando.");
    }
}
// REGISTRAR ESTUDIANTE EN GO Y VALIDAR CON RUST
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const ci = document.getElementById("ci").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const curso = document.getElementById("curso").value.trim();
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
        const estudiante = await respuesta.json();
        estudiantes.push(estudiante);
        mostrarEstudiante(estudiante);
        actualizarSelectores();
        formulario.reset();
        alert("Estudiante registrado correctamente en Go.");
    }
    catch (error) {
        console.error(error);
        alert("No se pudo registrar. Verifique que Go y Rust estén funcionando.");
    }
});
// REGISTRAR NOTA TEMPORALMENTE EN LA PÁGINA
formularioNota.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const ci = selectorNota.value;
    const calificacion = Number(document.getElementById("calificacion").value);
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
        const resultado = datos;
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
        resultadoAnalisis.append(titulo, nombre, calificaciones, promedio, nivel, recomendacion);
    }
    catch (error) {
        console.error(error);
        resultadoAnalisis.textContent =
            error instanceof Error
                ? `Error en el análisis: ${error.message}`
                : "No se pudo conectar con el servicio de análisis.";
    }
    finally {
        botonAnalizar.disabled = false;
        botonAnalizar.textContent = "Analizar calificaciones";
    }
});
// REGISTRAR ASISTENCIA TEMPORALMENTE EN LA PÁGINA
formularioAsistencia.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const ci = document.getElementById("estudianteAsistencia").value;
    const estado = document.getElementById("estadoAsistencia").value;
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
