
FROM rust:1-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/validacion-rust ./validacion-rust
EXPOSE 8081
CMD ["sh", "-c", "./validacion-rust"]
