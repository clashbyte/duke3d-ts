
in vec3 position;
in vec2 uv;

out vec2 directUV;

void main() {
    directUV = uv;
    gl_Position = projMat * viewMat * modelMat * vec4(position, 1.0);
}
