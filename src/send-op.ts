import axios from "axios";
import { ethers } from "ethers";

type OpData = {
  account: string;
  target: string;
  args: any[];
  functionName: string;
  abi: any;
}

export const sendOp = async (requests: OpData[]) => {
  return Promise.race([
    new Promise((_, reject) => {
      setTimeout(() => {
        reject('Timeout from blessnet');
        // webhook timeout thingy
      }, 10_000);
    }),
    async () => {
      const ops = requests.map((request) => {
        const iface = new ethers.Interface(request.abi);
        const data = iface.encodeFunctionData(
          request.functionName,
          request.args
        );
        return {
          account: request.account,
          target: request.target,
          calldata: data,
        };
      });

      try {
        const response = await axios.post('/account-abstraction/operations', {
          ops,
        });
        return new Promise((resolve) => {
          const deliveryId = response.data.deliveryIds[0];

          // poll delivery status
          const pollInterval = setInterval(async () => {
            const deliveryRes = await axios.get(`/deliveries/${deliveryId}`);
            const status = deliveryRes.data.status;
            console.log(status);
            if (status === 'delivered') {
              clearInterval(pollInterval);
              resolve(deliveryRes.data);
            }
            if (status === 'failed') {
              clearInterval(pollInterval);
              resolve(null);
            }
          }, 500);
        });
      } catch (error) {
        console.error('Error sending operation:', error);
        return null;
      }
    },
  ]);
}
