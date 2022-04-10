use crate::consensus::FediMintConsensus;
use minimint_api::module::http;
use minimint_api::module::http::{Method, Response};
use minimint_api::module::interconnect::ModuleInterconect;
use minimint_api::FederationModule;
use rand::CryptoRng;
use secp256k1_zkp::rand::RngCore;
use serde_json::Value;

pub struct FediMintInterconnect<'a, R: RngCore + CryptoRng> {
    pub fedimint: &'a FediMintConsensus<R>,
}

impl<'a, R> ModuleInterconect for FediMintInterconnect<'a, R>
where
    R: RngCore + CryptoRng,
{
    fn call(
        &self,
        module: &'static str,
        path: String,
        method: Method,
        data: Value,
    ) -> http::Result<Response> {
        match module {
            "wallet" => call_internal(&self.fedimint.wallet, path, method, data),
            "mint" => call_internal(&self.fedimint.mint, path, method, data),
            "ln" => call_internal(&self.fedimint.ln, path, method, data),
            _ => Err(http::Error::from_str(404, "Module not found")),
        }
    }
}

fn call_internal<M: FederationModule + 'static>(
    module: &M,
    path: String,
    method: Method,
    data: Value,
) -> http::Result<Response> {
    let endpoint = module
        .api_endpoints()
        .iter()
        .find(|endpoint| endpoint.method == method && endpoint.path_spec == path)
        .ok_or_else(|| http::Error::from_str(404, "Endpoint not found"))?;

    // FIXME: implement parameter handling
    assert!(
        endpoint.params.is_empty(),
        "Interconnect does not support parameter parsing yet!"
    );

    (endpoint.handler)(module, Default::default(), data)
}