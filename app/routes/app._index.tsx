import {
  Page,
  Card,
} from "@shopify/polaris";
import { TitleBar} from "@shopify/app-bridge-react";

export default function Index() {

  return (
    <Page>
      <TitleBar title="SAP Sync" />
      <Card>
        For any questions please submit a HelpDesk ticket to IT.

        {/*Product Status: DRAFT - Untouched by SAP, ACTIVE - SAP data loaded, ARCHIVED - Will no longer get SAP updates */} 
      </Card>
    </Page>
  );
}
