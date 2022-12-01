
uniform sampler2D bitmap;
uniform sampler2D palette;
uniform float opacity;
uniform float shadeOffset;

in vec2 directUV;

void main() {
    float colorIndex = texture(bitmap, directUV).r;
    float shade = clamp((shadeOffset) / 32.0, 0.0, 1.0);
    vec4 color = texture(palette, vec2(colorIndex, shade)).rgba;
    color.a *= opacity;
    gl_FragColor = color;
}
