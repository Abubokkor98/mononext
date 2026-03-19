import { source } from '@/lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

async function resolveDocPage(paramsPromise: DocsPageProps['params']) {
  const { slug } = await paramsPromise;
  const page = source.getPage(slug);
  if (!page) notFound();
  return page;
}

export default async function Page(props: DocsPageProps) {
  const page = await resolveDocPage(props.params);

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents }} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: DocsPageProps) {
  const page = await resolveDocPage(props.params);

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
