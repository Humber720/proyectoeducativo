
from flask import Flask, request, jsonify

app = Flask(__name__)


def analizar_rendimiento(nombre, notas):
    if not notas:
        return {
            "error": "No hay calificaciones para analizar."
        }

    if any(
        not isinstance(nota, (int, float))
        or isinstance(nota, bool)
        or nota < 0
        or nota > 100
        for nota in notas
    ):
        return {
            "error": "Las calificaciones deben estar entre 0 y 100."
        }

    promedio = sum(notas) / len(notas)

    if promedio >= 80:
        nivel = "Rendimiento satisfactorio"
        recomendacion = "Continuar con el buen desempeño."
    elif promedio >= 51:
        nivel = "Necesita reforzar algunos contenidos"
        recomendacion = "Practicar y revisar los temas con dificultad."
    else:
        nivel = "Necesita apoyo académico"
        recomendacion = "Realizar seguimiento y actividades de refuerzo."

    return {
        "estudiante": nombre,
        "calificaciones": notas,
        "promedio": round(promedio, 2),
        "nivel": nivel,
        "recomendacion": recomendacion
    }


@app.route("/analizar", methods=["POST"])
def analizar():
    datos = request.get_json(silent=True)

    if not isinstance(datos, dict):
        return jsonify({"error": "Debe enviar datos en formato JSON."}), 400

    nombre = datos.get("nombre")
    notas = datos.get("notas")

    if not isinstance(nombre, str) or not nombre.strip():
        return jsonify({"error": "Debe indicar el nombre del estudiante."}), 400

    if not isinstance(notas, list) or not notas:
        return jsonify({"error": "Debe enviar una lista de calificaciones."}), 400

    resultado = analizar_rendimiento(nombre.strip(), notas)

    if "error" in resultado:
        return jsonify(resultado), 400

    return jsonify(resultado)



if __name__ == "__main__":
    import os

    puerto = int(os.environ.get("PORT", 5000))
    print(f"Servicio Python iniciado en el puerto {puerto}")
    app.run(host="0.0.0.0", port=puerto, debug=False)
