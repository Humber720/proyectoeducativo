
package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

type Estudiante struct {
	CI     string `json:"ci"`
	Nombre string `json:"nombre"`
	Curso  string `json:"curso"`
}

type SolicitudRust struct {
	CI     string `json:"ci"`
	Nombre string `json:"nombre"`
}

type RespuestaRust struct {
	Valido  bool   `json:"valido"`
	Mensaje string `json:"mensaje"`
}

var estudiantes = make([]Estudiante, 0)
var mutex sync.Mutex

var clienteHTTP = &http.Client{
	Timeout: 10 * time.Second,
}

func configurarCORS(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func validarConRust(estudiante Estudiante) (RespuestaRust, int, error) {
	datos := SolicitudRust{
		CI:     estudiante.CI,
		Nombre: estudiante.Nombre,
	}

	cuerpo, err := json.Marshal(datos)
	if err != nil {
		return RespuestaRust{}, 0, err
	}

	req, err := http.NewRequest(
		http.MethodPost,
		"http://127.0.0.1:8081/validar",
		bytes.NewBuffer(cuerpo),
	)
	if err != nil {
		return RespuestaRust{}, 0, err
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := clienteHTTP.Do(req)
	if err != nil {
		return RespuestaRust{}, 0, err
	}
	defer resp.Body.Close()

	var resultado RespuestaRust
	if err := json.NewDecoder(resp.Body).Decode(&resultado); err != nil {
		return RespuestaRust{}, 0, err
	}

	return resultado, resp.StatusCode, nil
}

func estudiantesHandler(w http.ResponseWriter, r *http.Request) {
	configurarCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	switch r.Method {
	case http.MethodGet:
		mutex.Lock()
		defer mutex.Unlock()

		json.NewEncoder(w).Encode(estudiantes)

	case http.MethodPost:
		var estudiante Estudiante

		if err := json.NewDecoder(r.Body).Decode(&estudiante); err != nil {
			http.Error(w, `{"error":"Datos incorrectos"}`, http.StatusBadRequest)
			return
		}

		if estudiante.CI == "" ||
			estudiante.Nombre == "" ||
			estudiante.Curso == "" {
			http.Error(w, `{"error":"Complete todos los campos"}`, http.StatusBadRequest)
			return
		}

		resultado, codigo, err := validarConRust(estudiante)
		if err != nil {
			log.Printf("Error al conectar con Rust: %v", err)
			http.Error(w, `{"error":"El servicio Rust no está disponible"}`, http.StatusServiceUnavailable)
			return
		}

		if codigo != http.StatusOK || !resultado.Valido {
			w.WriteHeader(codigo)
			json.NewEncoder(w).Encode(resultado)
			return
		}

		mutex.Lock()
		defer mutex.Unlock()

		for _, e := range estudiantes {
			if e.CI == estudiante.CI {
				http.Error(w, `{"error":"El C.I. ya está registrado"}`, http.StatusConflict)
				return
			}
		}

		estudiantes = append(estudiantes, estudiante)

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(estudiante)

	default:
		http.Error(w, `{"error":"Método no permitido"}`, http.StatusMethodNotAllowed)
	}
}

// Go envía las calificaciones a Python y devuelve su respuesta.
func analizarHandler(w http.ResponseWriter, r *http.Request) {
	configurarCORS(w)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Utilice el método POST"}`, http.StatusMethodNotAllowed)
		return
	}

	cuerpo, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error":"No se pudieron leer los datos"}`, http.StatusBadRequest)
		return
	}

	req, err := http.NewRequest(
		http.MethodPost,
		"http://127.0.0.1:5000/analizar",
		bytes.NewReader(cuerpo),
	)
	if err != nil {
		http.Error(w, `{"error":"No se pudo preparar la solicitud"}`, http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := clienteHTTP.Do(req)
	if err != nil {
		log.Printf("Error al conectar con Python: %v", err)
		http.Error(w, `{"error":"El servicio Python no está disponible"}`, http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func main() {
	http.HandleFunc("/estudiantes", estudiantesHandler)
	http.HandleFunc("/analizar", analizarHandler)

	log.Println("Servidor Go iniciado en http://localhost:8080")
	log.Println("Validacion de estudiantes mediante Rust")
	log.Println("Analisis academico mediante Python")

	log.Fatal(http.ListenAndServe(":8080", nil))
}
