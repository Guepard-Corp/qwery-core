import type { Meta, StoryObj } from '@storybook/react';
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from './inline-citation';

const meta: Meta<typeof InlineCitation> = {
  title: 'AI Elements/InlineCitation',
  component: InlineCitation,
};

export default meta;
type Story = StoryObj<typeof InlineCitation>;

export const Simple: Story = {
  render: () => (
    <div className="max-w-2xl">
      <p>
        This is some text with an{' '}
        <InlineCitation>
          <InlineCitationText>inline citation</InlineCitationText>
          <InlineCitationCard>
            <InlineCitationCardTrigger sources={['https://example.com']} />
            <InlineCitationCardBody>
              <InlineCitationSource
                title="Example Source"
                url="https://example.com"
                description="This is an example source description"
              />
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>{' '}
        in the middle of a sentence.
      </p>
    </div>
  ),
};

export const WithMultipleSources: Story = {
  render: () => (
    <div className="max-w-2xl">
      <p>
        This text references{' '}
        <InlineCitation>
          <InlineCitationText>multiple sources</InlineCitationText>
          <InlineCitationCard>
            <InlineCitationCardTrigger
              sources={[
                'https://example.com',
                'https://another-example.com',
                'https://third-example.com',
              ]}
            />
            <InlineCitationCardBody>
              <InlineCitationCarousel>
                <InlineCitationCarouselContent>
                  <InlineCitationCarouselItem>
                    <InlineCitationSource
                      title="First Source"
                      url="https://example.com"
                      description="Description of the first source"
                    />
                  </InlineCitationCarouselItem>
                  <InlineCitationCarouselItem>
                    <InlineCitationSource
                      title="Second Source"
                      url="https://another-example.com"
                      description="Description of the second source"
                    />
                  </InlineCitationCarouselItem>
                  <InlineCitationCarouselItem>
                    <InlineCitationSource
                      title="Third Source"
                      url="https://third-example.com"
                      description="Description of the third source"
                    />
                  </InlineCitationCarouselItem>
                </InlineCitationCarouselContent>
                <InlineCitationCarouselHeader>
                  <InlineCitationCarouselIndex />
                  <div className="flex gap-1">
                    <InlineCitationCarouselPrev />
                    <InlineCitationCarouselNext />
                  </div>
                </InlineCitationCarouselHeader>
              </InlineCitationCarousel>
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>{' '}
        for more information.
      </p>
    </div>
  ),
};

export const WithQuote: Story = {
  render: () => (
    <div className="max-w-2xl">
      <p>
        According to the source,{' '}
        <InlineCitation>
          <InlineCitationText>this is a quoted statement</InlineCitationText>
          <InlineCitationCard>
            <InlineCitationCardTrigger sources={['https://example.com']} />
            <InlineCitationCardBody>
              <InlineCitationSource
                title="Example Source"
                url="https://example.com"
              />
              <InlineCitationQuote>
                "This is a direct quote from the source material that provides
                additional context and information."
              </InlineCitationQuote>
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>
        .
      </p>
    </div>
  ),
};

