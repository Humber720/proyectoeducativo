
use axum::{
    extract::Json,
    http::StatusCode,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Solicitud {
    ci: String,
    nombre: String,
    #[serde(default)]
    nota: Option<f64>,
}

#[derive(Serialize)]
struct Respuesta {
    valido: bool,
    mensaje: String,
}

fn validar(solicitud: &Solicitud) -> Result<(), String> {
    let ci = solicitud.ci.trim();
    let nombre = solicitud.nombre.trim();

    if ci.is_empty() || !ci.chars().all(|c| c.is_ascii_digit()) {
        return Err("El C.I. debe contener solamente numeros.".to_string());
    }

    if nombre.is_empty() {
        return Err("El nombre no puede estar vacio.".to_string());
    }

    if let Some(nota) = solicitud.nota {
        if !nota.is_finite() || !(0.0..=100.0).contains(&nota) {
            return Err("La calificacion debe estar entre 0 y 100.".to_string());
        }
    }

    Ok(())
}

async fn validar_handler(
    Json(solicitud): Json<Solicitud>,
) -> (StatusCode, Json<Respuesta>) {
    match validar(&solicitud) {
        Ok(()) => (
            StatusCode::OK,
            Json(Respuesta {
                valido: true,
                mensaje: "Datos validos.".to_string(),
            }),
        ),
        Err(mensaje) => (
            StatusCode::BAD_REQUEST,
            Json(Respuesta {
                valido: false,
                mensaje,
            }),
        ),
    }
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/validar", post(validar_handler));

    let direccion = "127.0.0.1:8081";
    let listener = tokio::net::TcpListener::bind(direccion)
        .await
        .expect("No se pudo iniciar el servicio Rust");

    println!("Servicio Rust disponible en http://{direccion}");

    axum::serve(listener, app)
        .await
        .expect("Error en el servicio Rust");
}
