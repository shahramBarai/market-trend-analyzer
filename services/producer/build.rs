fn main() {
    prost_build::compile_protos(&["../../shared/message.proto"], &["../../shared/"]).unwrap();
}
