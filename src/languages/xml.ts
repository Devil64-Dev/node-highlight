import { APOS_STRING_MODE, COMMENT, QUOTE_STRING_MODE } from '../core/modes';
import { LanguageDFn, Mode } from '../types';
import { inherit } from '../utils';
import {
  concat,
  either,
  lookahead,
  optional,
} from '../utils/regex';

const xmlLanguage: LanguageDFn = () => {
  const TAG_NAME_RE = concat(/[A-Z_]/, optional(/[A-Z0-9_.-]*:/), /[A-Z0-9_.-]*/);
  const XML_IDENT_RE = /[A-Za-z0-9._:-]+/;
  const XML_ENTITIES = { className: 'symbol', begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/ };

  const XML_META_KEYWORDS: Mode = {
    begin: /\s/,
    contains: [
      {
        className: 'keyword',
        begin: /#?[a-z_][a-z1-9_-]+/,
        illegal: /\n/,
      },
    ],
  };

  const XML_META_PAR_KEYWORDS: Mode = inherit<Mode>(XML_META_KEYWORDS, {
    begin: /\(/,
    end: /\)/,
  });

  const APOS_META_STRING_MODE = inherit(APOS_STRING_MODE, { className: 'string' });
  const QUOTE_META_STRING_MODE = inherit(QUOTE_STRING_MODE, { className: 'string' });

  const TAG_INTERNALS = {
    endsWithParent: true,
    illegal: /</,
    relevance: 0,
    contains: [
      {
        className: 'attr',
        begin: XML_IDENT_RE,
        relevance: 0,
      },
      {
        begin: /=\s*/,
        relevance: 0,
        contains: [
          {
            className: 'string',
            endsParent: true,
            variants: [
              {
                begin: /"/,
                end: /"/,
                contains: [XML_ENTITIES],
              },
              {
                begin: /'/,
                end: /'/,
                contains: [XML_ENTITIES],
              },
              { begin: /[^\s"'=<>`]+/ },
            ],
          },
        ],
      },
    ],
  };

  return {
    name: 'HTML, XML',
    aliases: [
      'html',
      'xhtml',
      'rss',
      'atom',
      'xjb',
      'xsd',
      'xsl',
      'plist',
      'wsf',
      'svg',
    ],
    caseInsensitive: true,
    contains: [
      {
        className: 'meta',
        begin: /<![a-z]/,
        end: />/,
        relevance: 10,
        contains: [
          XML_META_KEYWORDS,
          QUOTE_META_STRING_MODE,
          APOS_META_STRING_MODE,
          XML_META_PAR_KEYWORDS,
          {
            begin: /\[/,
            end: /\]/,
            contains: [
              {
                className: 'meta',
                begin: /<![a-z]/,
                end: />/,
                contains: [
                  XML_META_KEYWORDS,
                  XML_META_PAR_KEYWORDS,
                  QUOTE_META_STRING_MODE,
                  APOS_META_STRING_MODE,
                ],
              },
            ],
          },
        ],
      },
      COMMENT(/<!--/, /-->/, { relevance: 10 }),
      { begin: /<!\[CDATA\[/, end: /\]\]>/, relevance: 10 },
      XML_ENTITIES,
      {
        className: 'meta',
        end: /\?>/,
        variants: [
          { begin: /<\?xml/, relevance: 10, contains: [QUOTE_STRING_MODE] },
          { begin: /<\?[a-z][a-z0-9]+/ },
        ],
      },
      {
        className: 'tag',
        begin: /<style(?=\s|>)/,
        end: />/,
        keywords: { name: 'style' },
        contains: [TAG_INTERNALS],
        starts: {
          end: /<\/style>/,
          returnEnd: true,
          subLanguage: ['css', 'xml'],
        },
      },
      {
        className: 'tag',
        begin: /<script(?=\s|>)/,
        end: />/,
        keywords: { name: 'script' },
        contains: [TAG_INTERNALS],
        starts: {
          end: /<\/script>/,
          returnEnd: true,
          subLanguage: ['javascript', 'handlebars', 'xml'],
        },
      },
      { className: 'tag', begin: /<>|<\/>/ },
      {
        className: 'tag',
        begin: concat(
          /</,
          lookahead(concat(TAG_NAME_RE, either(/\/>/, />/, /\s/))),
        ),
        end: /\/?>/,
        contains: [{
          className: 'name',
          begin: TAG_NAME_RE,
          relevance: 0,
          starts: TAG_INTERNALS,
        }],
      },
      {
        className: 'tag',
        begin: concat(
          /<\//,
          lookahead(concat(TAG_NAME_RE, />/)),
        ),
        contains: [
          { className: 'name', begin: TAG_NAME_RE, relevance: 0 },
          { begin: />/, relevance: 0, endsParent: true },
        ],
      },
    ],
  };
};

export default xmlLanguage;
