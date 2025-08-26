import {
  reactExtension,
  useApi,
  AdminBlock,
  BlockStack,
  Heading,
  NumberField,
  InlineStack,
  TextField,
  Banner,
  ProgressIndicator
} from '@shopify/ui-extensions-react/admin';
import { useEffect, useState } from 'react';
import { getProductData } from './utils';

const TARGET = 'admin.product-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  const {data} = useApi(TARGET);

  const productId = data.selected[0].id;

  const [loading, setLoading] = useState(true);

  const [tone, setTone] = useState("");
  const [recipient, setRecipient] = useState("");
  const [nudityLevel, setNudityLevel] = useState(0);
  const [politicalLevel, setPoliticalLevel] = useState(0);
  const [sexualLevel, setSexualLevel] = useState(0);
  const [languageLevel, setLanguageLevel] = useState(0);

  useEffect(() => {
    (async function getProductInfo() {
      const productData = await getProductData(productId);

      if (productData.data.product.tone) {
        setTone(productData.data.product.tone.value);
      }
      
      if (productData.data.product.nuditylevel) {
        setNudityLevel(parseInt(productData.data.product.nuditylevel.value, 10));
      }

      if (productData.data.product.politicallevel) {
        setPoliticalLevel(parseInt(productData.data.product.politicallevel.value, 10));
      }

      if (productData.data.product.sexuallevel) {
        setSexualLevel(parseInt(productData.data.product.sexuallevel.value, 10));
      }

      if (productData.data.product.languagelevel) {
        setLanguageLevel(parseInt(productData.data.product.languagelevel.value, 10));
      }

      if (productData.data.product.recipient) {
        if(productData.data.product.recipient.reference.displayName.value === null) {
          setRecipient(productData.data.product.recipient.reference.name.value);
        } else {
          setRecipient(productData.data.product.recipient.reference.displayName.value);
        }
      }

      setLoading(false);
    })();
  }, [productId])

  return (
    // The AdminBlock component provides an API for setting the title of the Block extension wrapper.
    <AdminBlock title="AI Generated Information">
        <BlockStack gap>
          <Banner tone="info" title="Additional Field & Overrides">To override or view additional AI generated data go to "More actions" {'->'} "AI Analysis" at the top of the page.</Banner>
          { loading ?
            <ProgressIndicator size="small-200" />
          :
            <>
              <Heading size={5}>Metadata</Heading>
              <InlineStack gap>
                <TextField label="Tone" disabled value={tone} />
                <TextField label="Recipient" disabled value={recipient} />
              </InlineStack>
              <Heading size={5}>Crudeness Rankings</Heading>
              <InlineStack gap>
                <NumberField label="Nudity Level" disabled value={nudityLevel} />
                <NumberField label="Political Level" disabled value={politicalLevel} />
                <NumberField label="Sexual Innuendo Level" disabled value={sexualLevel} />
                <NumberField label="Foul Language Level" disabled value={languageLevel} />
              </InlineStack>
            </>
          }
        </BlockStack>
    </AdminBlock>
  );
}