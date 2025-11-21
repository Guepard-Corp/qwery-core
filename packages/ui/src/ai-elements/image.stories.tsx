import type { Meta, StoryObj } from '@storybook/react';
import { Image } from './image';

const meta: Meta<typeof Image> = {
  title: 'AI Elements/Image',
  component: Image,
};

export default meta;
type Story = StoryObj<typeof Image>;

// Simple 1x1 red pixel PNG in base64
const redPixelBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Simple 2x2 checkerboard pattern
const checkerboardBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVQIHWP8z8Dw/z8DAwMAZAoB9XWQJQAAAABJRU5ErkJggg==';

export const Simple: Story = {
  render: () => (
    <div className="max-w-md">
      <Image base64={redPixelBase64} mediaType="image/png" alt="Red pixel" />
    </div>
  ),
};

export const Checkerboard: Story = {
  render: () => (
    <div className="max-w-md">
      <Image
        base64={checkerboardBase64}
        mediaType="image/png"
        alt="Checkerboard pattern"
      />
    </div>
  ),
};

export const WithCustomSize: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div>
        <p className="text-muted-foreground mb-2 text-sm">Small (100x100)</p>
        <Image
          base64={redPixelBase64}
          mediaType="image/png"
          alt="Small image"
          className="h-[100px] w-[100px]"
        />
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-sm">Medium (200x200)</p>
        <Image
          base64={redPixelBase64}
          mediaType="image/png"
          alt="Medium image"
          className="h-[200px] w-[200px]"
        />
      </div>
    </div>
  ),
};

export const WithUint8Array: Story = {
  render: () => {
    // Create a simple 1x1 pixel image
    const uint8Array = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    return (
      <div className="max-w-md">
        <Image
          base64={redPixelBase64}
          uint8Array={uint8Array}
          mediaType="image/png"
          alt="Image from Uint8Array"
        />
      </div>
    );
  },
};
