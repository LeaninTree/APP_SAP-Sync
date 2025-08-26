import {
  reactExtension,
  useApi,
  AdminAction,
  BlockStack,
  Button,
  Text,
  Banner,
  ProgressIndicator
} from '@shopify/ui-extensions-react/admin';
import { useCallback, useState } from 'react';
import { updateProduct } from './utils';

const TARGET = 'admin.product-details.action.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  const {close, data} = useApi(TARGET);

  const [submitStatus, setSubmitStatus] = useState(true);
  const [errorsList, setErrorsList] = useState([]);

  const onSubmit = useCallback(async () => {
    setSubmitStatus(false);
    setErrorsList([]);
    const returnedData = await updateProduct(data.selected[0].id);
    if (returnedData[0].code === "SUCCESS") {
      close();
    }

    setErrorsList(returnedData);

  }, [])

  return (
    <AdminAction
      primaryAction={
        <Button
          onPress={onSubmit}
        >
          Sync
        </Button>
      }
      secondaryAction={
        <Button
          onPress={() => {
            close();
          }}
        >
          Cancel
        </Button>
      }
    >
      <BlockStack inlineAlignment='center' gap>
        {submitStatus ?
          <Banner tone='critical' title='WARNING'>
            <Text>This action will override any manually set data on Shopify.</Text>
            <Text>All changes should be done within SAP to guarantee those changes persist.</Text>
          </Banner>
        :
          <>
            {errorsList.length > 0 ?
              <>
                {errorsList.map(error => (
                  <Banner tone='critical' title='ERROR'>
                    <Text>[{error.code}] {error.message}</Text>
                  </Banner>
                ))}
              </>
            :
              <ProgressIndicator size="small-200" />
            }
          </>
        }
      </BlockStack>
    </AdminAction>
  );
}