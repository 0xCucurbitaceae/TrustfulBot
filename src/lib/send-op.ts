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
  const opRequest = async () => {
    const ops = requests.map((request) => {
      const iface = new ethers.Interface(request.abi);
      const data = iface.encodeFunctionData(request.functionName, request.args);
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
      return new Promise((resolve, reject) => {
        const deliveryId = response.data.deliveryIds[0];

        // poll delivery status
        const pollInterval = setInterval(async () => {
          const deliveryRes = await axios.get(`/deliveries/${deliveryId}`);
          const status = deliveryRes.data.status;
          console.log(deliveryRes.data);
          if (status === 'delivered') {
            clearInterval(pollInterval);
            resolve(deliveryRes.data);
          }
          if (status === 'failed') {
            clearInterval(pollInterval);
            reject('deliveryRes.data');
          }
        }, 500);
      });
    } catch (error) {
      console.error('Error sending operation:', error);
      return null;
    }
  };
  return Promise.race([
    new Promise((resolve) => {
      setTimeout(() => {
        console.log('Timed out');
        resolve('Timeout from blessnet');
        // webhook timeout thingy
      }, 10_000);
    }),
    opRequest(),
  ]);
}
