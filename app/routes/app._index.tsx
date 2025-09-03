import {
  Page,
  Card,
  Button
} from "@shopify/polaris";
import { TitleBar} from "@shopify/app-bridge-react";
import { useFetcher } from "@remix-run/react";

export default function Index() {

  const fetcher = useFetcher();

  const handleLogToken = () => {
    fetcher.load(`/api/shopify/accesstoken/log`);
  }

  return (
    <Page>
      <TitleBar title="SAP Sync" />
      <Card>
        <Button onClick={() => handleLogToken()}>Log Current Access Token</Button>
        For any questions please submit a HelpDesk ticket to IT.

        {/*Product Status: DRAFT - Untouched by SAP, ACTIVE - SAP data loaded, ARCHIVED - Will no longer get SAP updates */} 
      </Card>
    </Page>
  );
}
